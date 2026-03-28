import type { ActivityInput, OptimizeResult, TransportMode } from "./types";
import { MEAL_WINDOWS } from "./config";

const ORS_API_KEY = process.env.ORS_API_KEY;
const ORS_URL = "https://api.openrouteservice.org/optimization";

function timeToSeconds(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h * 60 + m) * 60;
}

/** 00:00 close = 跨日（午夜）→ 換算成 86400s（24:00）避免 Vroom invalid window */
function safeClose(hhmm: string, openSec: number): number {
  const sec = timeToSeconds(hhmm);
  return sec === 0 || sec < openSec ? 86400 : sec;
}

function buildTimeWindow(act: ActivityInput): [number, number] | null {
  // 1. 用餐硬性時段，與 opening_hours 取交集
  if (act.type && MEAL_WINDOWS[act.type]) {
    const w = MEAL_WINDOWS[act.type];
    let open  = timeToSeconds(w.open);
    let close = timeToSeconds(w.close);
    if (act.opening_hours) {
      open  = Math.max(open,  timeToSeconds(act.opening_hours.open));
      close = Math.min(close, safeClose(act.opening_hours.close, open));
      if (open > close) {
        // 交集為空（餐廳不在用餐時段內）→ 退回純用餐時段
        open  = timeToSeconds(w.open);
        close = timeToSeconds(w.close);
      }
    }
    return [open, close];
  }
  // 2. 固定時間活動（票券、演出）→ 確切時間，不加容許誤差
  if (act.flexible === false) {
    const planned = timeToSeconds(act.time);
    return [planned, planned];
  }
  // 3. 開放時間窗口（Vroom 會自動處理提早到的等待時間）
  if (act.opening_hours) {
    const open = timeToSeconds(act.opening_hours.open);
    return [open, safeClose(act.opening_hours.close, open)];
  }
  return null;
}

/**
 * 呼叫 ORS Vroom 最佳化。
 * minuteMatrix：Google Distance Matrix 回傳的分鐘整數矩陣。
 * profile 固定 driving-car（矩陣已含真實資料，profile 只作格式用途）。
 */
export async function callVroom(
  activities: ActivityInput[],
  minuteMatrix: number[][],
  _mode: TransportMode,
  startTime: string,
  endTime: string
): Promise<OptimizeResult | null> {
  if (!ORS_API_KEY) {
    console.info("[vroom] ORS_API_KEY not set — skipping Vroom");
    return null;
  }

  const profile = "driving-car";
  const n = activities.length;
  console.info(`[vroom] calling ORS Vroom — ${n} activities, vehicle window ${startTime}–${endTime}`);

  // 分鐘 → 秒
  const secondMatrix = minuteMatrix.map((row) => row.map((v) => v * 60));

  const jobs = activities.map((act, i) => {
    const priority =
      act.importance === "must"      ? 100
      : act.importance === "preferred" ? 50
      : (act.type && MEAL_WINDOWS[act.type])  ? 50
      : 0;

    const job: Record<string, unknown> = {
      id: i + 1,
      location_index: i,
      service: act.duration_minutes * 60,
      priority,
    };
    const tw = buildTimeWindow(act);
    if (tw) {
      job.time_windows = [tw];
      const twType = act.type && MEAL_WINDOWS[act.type]
        ? `MEAL(${act.type})`
        : act.flexible === false
        ? `FIXED(${act.time})`
        : `HOURS(${act.opening_hours?.open}–${act.opening_hours?.close})`;
      console.info(`  Time window [${act.title}]: ${twType} priority=${priority}`);
    } else {
      console.info(`  Time window [${act.title}]: FREE priority=${priority}`);
    }
    return job;
  });

  // 若無任何活動有時間窗口，不設 vehicle time_window（對齊 Python OR-Tools 行為：
  // 無時間維度時所有活動必定排入，不會因 service 時間過長而 unassign）
  const hasAnyWindow = jobs.some((j) => j.time_windows !== undefined);
  // 對齊 Python OR-Tools 行為：time dimension 上限為 total_available + 60min
  // vehicle end time 加 60 分鐘緩衝，避免最後一個活動因略微超時被 unassign
  const endTimeBuffered = timeToSeconds(endTime) + 60 * 60;
  const vehicleBase = { id: 1, profile, start_index: 0 };
  const vehicles = [
    hasAnyWindow
      ? { ...vehicleBase, time_window: [timeToSeconds(startTime), endTimeBuffered] }
      : vehicleBase,
  ];

  if (!hasAnyWindow) {
    console.info("[vroom] no time windows — vehicle time_window omitted (all activities will be assigned)");
  }

  try {
    const res = await fetch(ORS_URL, {
      method: "POST",
      headers: {
        Authorization: ORS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jobs,
        vehicles,
        matrices: { [profile]: { durations: secondMatrix } },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`[vroom] ORS error ${res.status}: ${body}`);
      return null;
    }

    const data = await res.json();
    const routes = data.routes ?? [];
    if (!routes.length) {
      console.warn("[vroom] no routes returned");
      return null;
    }

    // 有未排入的活動 → 表示時間窗口太緊，不視為失敗，照常回傳排入的部分
    if (data.unassigned?.length) {
      const names = data.unassigned.map((u: { id: number }) => activities[u.id - 1]?.title ?? u.id);
      console.warn(`[vroom] ${data.unassigned.length} unassigned: ${names.join(", ")}`);
    }

    const steps: { id: number; arrival: number; service: number; waiting_time: number }[] =
      routes[0].steps.filter((s: { type: string }) => s.type === "job");

    const order = steps.map((s) => activities[s.id - 1].id);
    const travelTimes = steps.slice(0, -1).map((s, k) => {
      // 扣除等待時間（arrival 前的等開門時間），只取純行駛時間
      const travelSec = steps[k + 1].arrival - s.arrival - s.waiting_time - s.service;
      return Math.max(1, Math.round(travelSec / 60));
    });

    // 活動實際開始時間 = arrival（絕對秒）+ waiting_time → "HH:MM"
    const startTimes = steps.map((s) => {
      const sec = s.arrival + s.waiting_time;
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    });

    const totalTravel = travelTimes.reduce((a, b) => a + b, 0);
    const routeCost = routes[0].cost ?? routes[0].duration ?? "?";
    console.info(`[vroom] solution found — cost=${routeCost}, total_travel=${totalTravel}min`);
    console.info(`  order: ${steps.map((s) => activities[s.id - 1].title).join(" → ")}`);
    console.info(`  start_times: [${startTimes.join(", ")}]`);
    console.info(`  travel_times: [${travelTimes.join(", ")}] min`);

    return { order, travel_times_minutes: travelTimes, start_times: startTimes };
  } catch (err) {
    console.warn("[vroom] exception:", err);
    return null;
  }
}
