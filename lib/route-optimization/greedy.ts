import type { ActivityInput, OptimizeResult } from "./types";
import { MEAL_WINDOWS } from "./config";

function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * 時間窗口感知的貪心最近鄰算法（移植自 Python _layer3_greedy）。
 * 不依賴任何外部 API，永遠回傳結果。
 */
export function greedyFallback(
  activities: ActivityInput[],
  matrix: number[][],
  startTimeMinutes: number
): OptimizeResult {
  const n = activities.length;
  const hasWindows = activities.some((a) => a.opening_hours);

  console.info(`[greedy] fallback — ${n} activities, hasWindows=${hasWindows}`);

  // 起點：有時間窗口時從最早開門的地點出發
  let start = 0;
  if (hasWindows) {
    let earliest = Infinity;
    activities.forEach((a, i) => {
      const open = a.opening_hours ? parseTimeToMinutes(a.opening_hours.open) : 9999;
      if (open < earliest) { earliest = open; start = i; }
    });
    console.info(`[greedy] start at earliest-opening: ${activities[start].title} (${activities[start].opening_hours?.open ?? "?"})`);
  }

  const unvisited = new Set(Array.from({ length: n }, (_, i) => i));
  let current = start;
  unvisited.delete(start);
  const route = [start];
  let currentTime = startTimeMinutes;

  while (unvisited.size > 0) {
    let nextNode = -1;

    if (hasWindows) {
      // 優先選可在窗口內抵達且等待+行駛最少的
      let bestScore: [number, number] = [3, Infinity];
      for (const j of unvisited) {
        const travel = matrix[current][j];
        const arrive = currentTime + activities[current].duration_minutes + travel;
        let score: [number, number];

        // 用餐活動（lunch/dinner/breakfast）：用餐時段前完全不可選（not yet available）
        if (activities[j].type && MEAL_WINDOWS[activities[j].type!]) {
          const mw = MEAL_WINDOWS[activities[j].type!];
          const mwOpen  = parseTimeToMinutes(mw.open);
          const mwClose = parseTimeToMinutes(mw.close);
          if (arrive < mwOpen || arrive > mwClose) {
            score = [2, travel]; // 還未到 / 已錯過用餐時段 → 不選
          } else {
            // 在用餐時段內，考慮餐廳自身 opening_hours
            const restaurantOpen = activities[j].opening_hours
              ? parseTimeToMinutes(activities[j].opening_hours!.open)
              : mwOpen;
            const wait = Math.max(0, restaurantOpen - arrive);
            score = [0, wait + travel];
          }
        } else if (activities[j].opening_hours) {
          const open  = parseTimeToMinutes(activities[j].opening_hours!.open);
          const rawClose = parseTimeToMinutes(activities[j].opening_hours!.close);
          const close = rawClose === 0 || rawClose < open ? 24 * 60 : rawClose;
          if (arrive > close) {
            score = [2, travel]; // 已錯過窗口，最低優先
          } else {
            const wait = Math.max(0, open - arrive);
            score = [0, wait + travel]; // 優先：等待+行駛最少
          }
        } else {
          score = [1, travel]; // 無窗口，次要優先
        }
        if (score[0] < bestScore[0] || (score[0] === bestScore[0] && score[1] < bestScore[1])) {
          bestScore = score;
          nextNode = j;
        }
      }
      const travel = matrix[current][nextNode];
      const arrive = currentTime + activities[current].duration_minutes + travel;
      // 更新 currentTime：用餐活動等到 meal window open，其餘等到 opening_hours open
      if (activities[nextNode].type && MEAL_WINDOWS[activities[nextNode].type!]) {
        const mwOpen = parseTimeToMinutes(MEAL_WINDOWS[activities[nextNode].type!].open);
        const restaurantOpen = activities[nextNode].opening_hours
          ? parseTimeToMinutes(activities[nextNode].opening_hours!.open)
          : mwOpen;
        currentTime = Math.max(arrive, mwOpen, restaurantOpen);
      } else if (activities[nextNode].opening_hours) {
        const open = parseTimeToMinutes(activities[nextNode].opening_hours!.open);
        currentTime = Math.max(arrive, open);
      } else {
        currentTime = arrive;
      }
    } else {
      // 無時間窗口：純最近鄰
      let minTravel = Infinity;
      for (const j of unvisited) {
        if (matrix[current][j] < minTravel) {
          minTravel = matrix[current][j];
          nextNode = j;
        }
      }
    }

    route.push(nextNode);
    unvisited.delete(nextNode);
    current = nextNode;
  }

  const order = route.map((i) => activities[i].id);
  const travelTimes = route.slice(0, -1).map((from, k) =>
    Math.max(1, matrix[from][route[k + 1]])
  );

  // 依路線順序推算每個活動的實際開始時間（含用餐時段、營業時間限制）
  const startTimes: string[] = [];
  let t = startTimeMinutes;
  for (let k = 0; k < route.length; k++) {
    const act = activities[route[k]];
    if (act.type && MEAL_WINDOWS[act.type]) {
      t = Math.max(t, parseTimeToMinutes(MEAL_WINDOWS[act.type].open));
    } else if (act.opening_hours) {
      t = Math.max(t, parseTimeToMinutes(act.opening_hours.open));
    } else if (act.flexible === false) {
      t = parseTimeToMinutes(act.time);
    }
    startTimes.push(formatTime(t));
    t += act.duration_minutes + (k < travelTimes.length ? travelTimes[k] : 0);
  }

  const totalTravel = travelTimes.reduce((a, b) => a + b, 0);
  console.info(`[greedy] total_travel=${totalTravel}min`);
  console.info(`  order: ${route.map((i) => activities[i].title).join(" → ")}`);
  console.info(`  start_times: [${startTimes.join(", ")}]`);
  console.info(`  travel_times: [${travelTimes.join(", ")}] min`);

  return { order, travel_times_minutes: travelTimes, start_times: startTimes };
}
