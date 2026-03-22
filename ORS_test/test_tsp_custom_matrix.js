/**
 * Test: ORS Vroom + 自訂矩陣
 * 把 Google Distance Matrix 的結果餵進 ORS Vroom
 * 使用 location_index 取代 location 座標
 *
 * 執行：node ORS_test/test_tsp_custom_matrix.js
 */

import { ORS_API_KEY, GOOGLE_API_KEY, hhmmToSeconds, divider } from "./utils.js";

const ACTIVITIES = [
  { id: "a1", title: "國立故宮博物院", lat: 25.1023, lng: 121.5484, duration_minutes: 120, time: "09:00", opening_hours: { open: "08:30", close: "18:00" } },
  { id: "a2", title: "台北 101",       lat: 25.0338, lng: 121.5645, duration_minutes: 60,  time: "11:00", opening_hours: { open: "11:00", close: "22:00" } },
  { id: "a3", title: "龍山寺",         lat: 25.0373, lng: 121.4997, duration_minutes: 45,  time: "13:00", opening_hours: { open: "06:00", close: "22:00" } },
  { id: "a4", title: "士林夜市",       lat: 25.0877, lng: 121.5241, duration_minutes: 90,  time: "17:00", opening_hours: { open: "17:00", close: "23:59" } },
  { id: "a5", title: "國立台灣博物館", lat: 25.0448, lng: 121.5128, duration_minutes: 60,  time: "09:00", opening_hours: { open: "09:30", close: "17:00" } },
  { id: "a6", title: "象山",           lat: 25.0273, lng: 121.5770, duration_minutes: 75,  time: "16:00", opening_hours: { open: "00:00", close: "23:59" } },
];

const MODE = "driving";

// ── Step 1: 取 Google Distance Matrix（秒）────────────────────
async function getGoogleDurationMatrix(activities) {
  if (!GOOGLE_API_KEY) return null;
  const coords = activities.map((a) => `${a.lat},${a.lng}`).join("|");
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(coords)}&destinations=${encodeURIComponent(coords)}&mode=${MODE}&key=${GOOGLE_API_KEY}`
  );
  const data = await res.json();
  if (data.status !== "OK") return null;
  // 回傳秒（Vroom 需要秒）
  return data.rows.map((row, i) =>
    row.elements.map((el, j) =>
      i === j ? 0 : el.status === "OK" ? el.duration.value : 3600
    )
  );
}

// ── Step 2: 傳入自訂矩陣給 ORS Vroom ─────────────────────────
async function vroomWithCustomMatrix(activities, durationMatrix, useTimeWindows) {
  if (!ORS_API_KEY) return null;

  const ORS_PROFILE = { driving: "driving-car", walking: "foot-walking", bicycling: "cycling-regular" };
  const profile = ORS_PROFILE[MODE] ?? "driving-car";

  // 用 location_index 而非 location 座標
  const jobs = activities.map((act, i) => {
    const job = {
      id: i + 1,
      location_index: i,        // 對應矩陣的 index
      service: act.duration_minutes * 60,
    };
    if (useTimeWindows && act.opening_hours) {
      job.time_windows = [[
        hhmmToSeconds(act.opening_hours.open),
        hhmmToSeconds(act.opening_hours.close),
      ]];
    }
    return job;
  });

  const vehicles = [{
    id: 1,
    profile,
    start_index: 0,            // 從 index 0 出發
    time_window: [hhmmToSeconds("09:00"), hhmmToSeconds("20:00")],
  }];

  // 自訂矩陣：key 必須與 vehicle profile 一致
  const matrices = {
    [profile]: {
      durations: durationMatrix,
    },
  };

  const t0 = Date.now();
  const res = await fetch("https://api.openrouteservice.org/optimization", {
    method: "POST",
    headers: { Authorization: ORS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ jobs, vehicles, matrices }),
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);

  if (!res.ok) {
    const txt = await res.text();
    console.log(`  [Vroom] 錯誤 ${res.status}: ${txt.slice(0, 300)}`);
    return null;
  }

  const data = await res.json();
  console.log("\n  [Vroom 原始回傳]");
  console.log(JSON.stringify(data, null, 2));
  return { data, elapsed };
}

// ── 解析結果 ──────────────────────────────────────────────────
function parseVroomResult(data, activities, elapsed) {
  const routes = data.routes ?? [];
  if (!routes.length) return null;

  const steps = routes[0].steps.filter((s) => s.type === "job");
  const order = steps.map((s) => activities[s.id - 1].id);
  const travelTimes = steps.slice(0, -1).map((s, k) => {
    const arrNext = steps[k + 1].arrival;
    const depart = s.arrival + (s.service ?? 0);
    return Math.max(1, Math.round((arrNext - depart) / 60));
  });

  // 印出時間表
  const idToAct = Object.fromEntries(activities.map((a) => [a.id, a]));
  console.log("\n  路線時間表：");
  steps.forEach((s, i) => {
    const act = activities[s.id - 1];
    const arrH = String(Math.floor(s.arrival / 3600)).padStart(2, "0");
    const arrM = String(Math.floor((s.arrival % 3600) / 60)).padStart(2, "0");
    const depSec = s.arrival + (s.service ?? 0);
    const depH = String(Math.floor(depSec / 3600)).padStart(2, "0");
    const depM = String(Math.floor((depSec % 3600) / 60)).padStart(2, "0");
    const wait = s.waiting_time ? `  等待 ${Math.round(s.waiting_time / 60)}min` : "";
    console.log(`    ${arrH}:${arrM} 抵達 / ${depH}:${depM} 離開  ${act.title}${wait}`);
  });

  return {
    order,
    travel_times_minutes: travelTimes,
    total_travel_min: travelTimes.reduce((s, v) => s + v, 0),
    elapsed,
    unassigned: data.unassigned ?? [],
  };
}

// ── 主程式 ────────────────────────────────────────────────────
async function main() {
  console.log(`\nORS Vroom + Google Distance Matrix 整合測試`);
  console.log(`Google API Key：${GOOGLE_API_KEY ? "✓" : "✗ 未設定"}`);
  console.log(`ORS API Key：  ${ORS_API_KEY ? "✓" : "✗ 未設定"}`);

  // 取 Google 距離矩陣
  console.log("\n  取得 Google Distance Matrix...");
  const matrix = await getGoogleDurationMatrix(ACTIVITIES);
  if (!matrix) { console.log("  ✗ Google Matrix 失敗"); return; }

  console.log("  Google 距離矩陣（秒）：");
  const names = ACTIVITIES.map((a) => a.title.slice(0, 4));
  console.log("         " + names.map((n) => n.padStart(6)).join(""));
  matrix.forEach((row, i) => {
    console.log(`  ${names[i].padStart(6)} ` + row.map((v) => String(v).padStart(6)).join(""));
  });

  // 測試 1：無時間窗口
  console.log(`\n${divider()}`);
  console.log("  測試 A：Google Matrix → Vroom（無時間窗口）");
  console.log(divider());
  const resA = await vroomWithCustomMatrix(ACTIVITIES, matrix, false);
  if (resA) parseVroomResult(resA.data, ACTIVITIES, resA.elapsed);

  // 測試 2：有時間窗口
  console.log(`\n${divider()}`);
  console.log("  測試 B：Google Matrix → Vroom（有時間窗口）");
  console.log(divider());
  const resB = await vroomWithCustomMatrix(ACTIVITIES, matrix, true);
  if (resB) parseVroomResult(resB.data, ACTIVITIES, resB.elapsed);

  console.log();
}

main().catch(console.error);
