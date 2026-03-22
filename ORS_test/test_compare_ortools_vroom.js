/**
 * 直接比較：OR-Tools (Python) vs ORS Vroom + Google Matrix
 * 兩者都使用 Google Distance Matrix，確保公平比較
 *
 * 執行：node ORS_test/test_compare_ortools_vroom.js
 * （需先啟動 Python 服務：cd python && python main.py）
 */

import { ORS_API_KEY, GOOGLE_API_KEY, hhmmToSeconds, divider } from "./utils.js";

const MODE = "driving";
const PYTHON_URL = process.env.PYTHON_OPTIMIZE_URL ?? "http://localhost:8000";

const BASE = [
  { id: "a1", title: "國立故宮博物院", lat: 25.1023, lng: 121.5484, duration_minutes: 120, time: "09:00" },
  { id: "a2", title: "台北 101",       lat: 25.0338, lng: 121.5645, duration_minutes: 60,  time: "11:00" },
  { id: "a3", title: "龍山寺",         lat: 25.0373, lng: 121.4997, duration_minutes: 45,  time: "13:00" },
  { id: "a4", title: "士林夜市",       lat: 25.0877, lng: 121.5241, duration_minutes: 90,  time: "17:00" },
  { id: "a5", title: "國立台灣博物館", lat: 25.0448, lng: 121.5128, duration_minutes: 60,  time: "14:30" },
  { id: "a6", title: "象山",           lat: 25.0273, lng: 121.5770, duration_minutes: 75,  time: "16:00" },
];

const WITH_WINDOWS = [
  { id: "a1", title: "國立故宮博物院", lat: 25.1023, lng: 121.5484, duration_minutes: 120, time: "09:00", opening_hours: { open: "08:30", close: "18:00" } },
  { id: "a2", title: "台北 101",       lat: 25.0338, lng: 121.5645, duration_minutes: 60,  time: "11:00", opening_hours: { open: "11:00", close: "22:00" } },
  { id: "a3", title: "龍山寺",         lat: 25.0373, lng: 121.4997, duration_minutes: 45,  time: "13:00", opening_hours: { open: "06:00", close: "22:00" } },
  { id: "a4", title: "士林夜市",       lat: 25.0877, lng: 121.5241, duration_minutes: 90,  time: "17:00", opening_hours: { open: "17:00", close: "23:59" } },
  { id: "a5", title: "國立台灣博物館", lat: 25.0448, lng: 121.5128, duration_minutes: 60,  time: "09:00", opening_hours: { open: "09:30", close: "17:00" } },
  { id: "a6", title: "象山",           lat: 25.0273, lng: 121.5770, duration_minutes: 75,  time: "16:00", opening_hours: { open: "00:00", close: "23:59" } },
];

// ── Google Distance Matrix（秒）──────────────────────────────
async function getGoogleMatrix(activities) {
  const coords = activities.map((a) => `${a.lat},${a.lng}`).join("|");
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(coords)}&destinations=${encodeURIComponent(coords)}&mode=${MODE}&key=${GOOGLE_API_KEY}`
  );
  const data = await res.json();
  if (data.status !== "OK") return null;
  return data.rows.map((row, i) =>
    row.elements.map((el, j) =>
      i === j ? 0 : el.status === "OK" ? el.duration.value : 3600
    )
  );
}

// ── OR-Tools（Python 服務）───────────────────────────────────
async function callORTools(activities) {
  try {
    const t0 = Date.now();
    const res = await fetch(`${PYTHON_URL}/optimize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activities, mode: MODE, start_time: "09:00", end_time: "20:00" }),
      signal: AbortSignal.timeout(15000),
    });
    const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
    if (!res.ok) return null;
    return { ...(await res.json()), elapsed };
  } catch {
    return null;
  }
}

// ── ORS Vroom + Google Matrix ─────────────────────────────────
async function callVroom(activities, googleMatrix, useWindows) {
  const profile = "driving-car";
  const jobs = activities.map((act, i) => {
    const job = { id: i + 1, location_index: i, service: act.duration_minutes * 60 };
    if (useWindows && act.opening_hours) {
      job.time_windows = [[hhmmToSeconds(act.opening_hours.open), hhmmToSeconds(act.opening_hours.close)]];
    }
    return job;
  });
  const vehicles = [{
    id: 1, profile,
    start_index: 0,
    time_window: [hhmmToSeconds("09:00"), hhmmToSeconds("20:00")],
  }];

  const t0 = Date.now();
  const res = await fetch("https://api.openrouteservice.org/optimization", {
    method: "POST",
    headers: { Authorization: ORS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ jobs, vehicles, matrices: { [profile]: { durations: googleMatrix } } }),
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
  if (!res.ok) { console.log(`  [Vroom] ${res.status}: ${(await res.text()).slice(0,200)}`); return null; }

  const data = await res.json();
  const steps = data.routes?.[0]?.steps?.filter((s) => s.type === "job") ?? [];
  const order = steps.map((s) => activities[s.id - 1].id);
  const travelTimes = steps.slice(0, -1).map((s, k) =>
    Math.max(1, Math.round((steps[k + 1].arrival - s.arrival - (s.service ?? 0)) / 60))
  );
  return { order, travel_times_minutes: travelTimes, cost: data.routes?.[0]?.cost, steps, elapsed, unassigned: data.unassigned ?? [] };
}

// ── 重新用 Google Matrix 計算路線實際成本 ─────────────────────
// OR-Tools 回傳的只是 index 順序，用 Google matrix 重新算真正的行駛時間
function calcRealCost(order, activities, googleMatrix) {
  const idToIdx = Object.fromEntries(activities.map((a, i) => [a.id, i]));
  let total = 0;
  const times = [];
  for (let k = 0; k < order.length - 1; k++) {
    const t = Math.round(googleMatrix[idToIdx[order[k]]][idToIdx[order[k + 1]]] / 60);
    times.push(t);
    total += t;
  }
  return { total, times };
}

// ── 印出結果 ──────────────────────────────────────────────────
function printResult(label, result, activities, googleMatrix, elapsed) {
  const idToName = Object.fromEntries(activities.map((a) => [a.id, a.title]));
  if (!result) { console.log(`\n  [${label}]  ✗ 無結果（Python 服務未啟動？）`); return null; }

  const real = calcRealCost(result.order, activities, googleMatrix);
  console.log(`\n  [${label}]  (${result.elapsed ?? elapsed}s)`);
  result.order.forEach((id, i) => {
    const t = real.times[i - 1];
    const prefix = i === 0 ? "     起點" : `  +${String(t).padStart(2)}min`;
    console.log(`    ${prefix}  ${i + 1}. ${idToName[id]}`);
  });
  console.log(`    Google matrix 實際總行駛：${real.total} 分鐘`);
  if (result.unassigned?.length) console.log(`    ⚠ 未排入：${result.unassigned.length} 個`);
  return real.total;
}

// ── 時間表（Vroom 專用，有精確到達時間）─────────────────────
function printSchedule(result, activities) {
  if (!result?.steps) return;
  console.log(`    時間表：`);
  result.steps.forEach((s) => {
    const act = activities[s.id - 1];
    const fmt = (sec) => `${String(Math.floor(sec / 3600)).padStart(2,"0")}:${String(Math.floor((sec % 3600) / 60)).padStart(2,"0")}`;
    const wait = s.waiting_time > 0 ? `  ⏳等 ${Math.round(s.waiting_time/60)}min` : "";
    console.log(`      ${fmt(s.arrival)} 抵達 → ${fmt(s.arrival + s.service)} 離開  ${act.title}${wait}`);
  });
}

// ── 主程式 ────────────────────────────────────────────────────
async function main() {
  console.log(`\nOR-Tools vs ORS Vroom（同樣使用 Google Distance Matrix）`);
  console.log(`Google API Key：${GOOGLE_API_KEY ? "✓" : "✗"}`);
  console.log(`ORS API Key：  ${ORS_API_KEY ? "✓" : "✗"}`);
  console.log(`Python 服務：  ${PYTHON_URL}`);

  for (const [label, activities, useWindows] of [
    ["無時間窗口", BASE, false],
    ["有時間窗口", WITH_WINDOWS, true],
  ]) {
    console.log(`\n${divider("=")}`);
    console.log(`  ${label}`);
    console.log(divider("="));

    const matrix = await getGoogleMatrix(activities);
    if (!matrix) { console.log("  Google Matrix 失敗"); continue; }

    const [ort, vroom] = await Promise.all([
      callORTools(activities),
      callVroom(activities, matrix, useWindows),
    ]);

    const ortCost  = printResult("OR-Tools", ort, activities, matrix);
    const vroomCost = printResult("ORS Vroom + Google Matrix", vroom, activities, matrix);

    // Vroom 時間表
    if (vroom?.steps) {
      console.log();
      printSchedule(vroom, activities);
    }

    // 勝負
    if (ortCost != null && vroomCost != null) {
      const diff = Math.abs(ortCost - vroomCost);
      const winner = ortCost < vroomCost ? "OR-Tools" : vroomCost < ortCost ? "ORS Vroom" : "平手";
      const sameOrder = ort?.order?.join() === vroom?.order?.join();
      console.log(`\n  ── 比較 ──`);
      console.log(`  路線成本：OR-Tools ${ortCost}min  vs  Vroom ${vroomCost}min  差 ${diff}min`);
      console.log(`  較優解：${winner}`);
      console.log(`  路線順序相同：${sameOrder ? "✓" : "✗"}`);
      if (!sameOrder) {
        const idToName = Object.fromEntries(activities.map((a) => [a.id, a.title]));
        console.log(`    OR-Tools：${ort.order.map((id) => idToName[id].slice(0,4)).join(" → ")}`);
        console.log(`    Vroom：   ${vroom.order.map((id) => idToName[id].slice(0,4)).join(" → ")}`);
      }
    }
  }
  console.log();
}

main().catch(console.error);
