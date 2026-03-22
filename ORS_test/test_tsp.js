/**
 * Test 2: TSP 求解比較
 * ORS Optimization (Vroom) vs Haversine Greedy（Python 服務不可用時的基準）
 * 若 Python 服務有執行，也會呼叫 /optimize 做三方比較
 *
 * 執行：node ORS_test/test_tsp.js
 */

import { ORS_API_KEY, GOOGLE_API_KEY, haversineMinutes, hhmmToSeconds, divider } from "./utils.js";

const MODE = "driving";
const PYTHON_URL = process.env.PYTHON_OPTIMIZE_URL ?? "http://localhost:8000";

// ── 測試資料 ──────────────────────────────────────────────────
const BASE_ACTIVITIES = [
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

// ── Haversine Greedy（本地基準，不需任何 API）────────────────
function greedyTSP(activities) {
  const SPEED = { driving: 40, walking: 4, bicycling: 15, transit: 20 };
  const speed = SPEED[MODE] ?? 40;
  const n = activities.length;
  const travelMin = (i, j) => haversineMinutes(activities[i].lat, activities[i].lng, activities[j].lat, activities[j].lng, speed);

  const visited = new Set([0]);
  const route = [0];
  while (route.length < n) {
    const last = route[route.length - 1];
    let best = -1, bestTime = Infinity;
    for (let j = 0; j < n; j++) {
      if (!visited.has(j)) {
        const t = travelMin(last, j);
        if (t < bestTime) { bestTime = t; best = j; }
      }
    }
    route.push(best);
    visited.add(best);
  }
  const order = route.map((i) => activities[i].id);
  const travelTimes = route.slice(0, -1).map((from, k) => travelMin(from, route[k + 1]));
  return { order, travel_times_minutes: travelTimes };
}

// ── OR-Tools（呼叫 Python 服務）──────────────────────────────
async function callORTools(activities) {
  try {
    const t0 = Date.now();
    const res = await fetch(`${PYTHON_URL}/optimize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activities, mode: MODE, start_time: "09:00", end_time: "20:00" }),
      signal: AbortSignal.timeout(10000),
    });
    const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
    if (!res.ok) return null;
    const data = await res.json();
    return { ...data, elapsed };
  } catch {
    return null;
  }
}

// ── ORS Optimization (Vroom) ──────────────────────────────────
async function callOrsVroom(activities) {
  if (!ORS_API_KEY) return null;
  const ORS_PROFILE = { driving: "driving-car", walking: "foot-walking", bicycling: "cycling-regular", transit: "driving-car" };
  const profile = ORS_PROFILE[MODE] ?? "driving-car";

  const jobs = activities.map((act, i) => {
    const job = {
      id: i + 1,
      location: [act.lng, act.lat],
      service: act.duration_minutes * 60,
    };
    if (act.opening_hours) {
      job.time_windows = [[hhmmToSeconds(act.opening_hours.open), hhmmToSeconds(act.opening_hours.close)]];
    }
    return job;
  });

  const vehicles = [{
    id: 1,
    profile,
    start: [activities[0].lng, activities[0].lat],
    time_window: [hhmmToSeconds("09:00"), hhmmToSeconds("20:00")],
  }];

  const t0 = Date.now();
  const res = await fetch("https://api.openrouteservice.org/optimization", {
    method: "POST",
    headers: { Authorization: ORS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ jobs, vehicles }),
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);

  if (!res.ok) {
    const txt = await res.text();
    console.log(`  [ORS Vroom] 錯誤 ${res.status}: ${txt.slice(0, 200)}`);
    return null;
  }

  const data = await res.json();
  const routes = data.routes ?? [];
  if (!routes.length) return null;

  const steps = routes[0].steps.filter((s) => s.type === "job");
  const idxToAct = Object.fromEntries(activities.map((a, i) => [i + 1, a]));
  const order = steps.map((s) => idxToAct[s.id].id);
  const travelTimes = steps.slice(0, -1).map((s, k) => {
    const arrNext = steps[k + 1].arrival;
    const departCurr = s.arrival + (s.service ?? 0);
    return Math.max(1, Math.round((arrNext - departCurr) / 60));
  });

  const summary = data.summary ?? {};
  return {
    order,
    travel_times_minutes: travelTimes,
    total_duration_min: Math.round((summary.duration ?? 0) / 60),
    total_distance_km: Math.round((summary.distance ?? 0) / 1000),
    elapsed,
    unassigned: data.unassigned ?? [],
  };
}

// ── 印出比較 ──────────────────────────────────────────────────
function printComparison(activities, results, label) {
  const idToName = Object.fromEntries(activities.map((a) => [a.id, a.title]));
  const totalCost = (times) => times.reduce((s, v) => s + v, 0);

  console.log(`\n${divider()}`);
  console.log(`  TSP 比較：${label}`);
  console.log(divider());

  for (const [name, result] of results) {
    if (!result) {
      console.log(`\n  [${name}]  ✗ 無結果`);
      continue;
    }
    const cost = totalCost(result.travel_times_minutes);
    console.log(`\n  [${name}]  (${result.elapsed ?? "—"}s)`);
    result.order.forEach((id, i) => {
      const t = result.travel_times_minutes[i - 1];
      const prefix = i === 0 ? "  起點" : `  +${String(t).padStart(2)}min`;
      console.log(`    ${prefix}  ${i + 1}. ${idToName[id]}`);
    });
    console.log(`    總行駛時間：${cost} 分鐘`);
    if (result.total_distance_km != null) console.log(`    總距離：${result.total_distance_km} km`);
    if (result.unassigned?.length) console.log(`    ⚠ 未排入：${result.unassigned.length} 個活動`);
  }

  // 成本比較
  const valid = results.filter(([, r]) => r);
  if (valid.length >= 2) {
    console.log(`\n  成本比較：`);
    for (const [name, result] of valid) {
      console.log(`    ${name.padEnd(15)} ${totalCost(result.travel_times_minutes)} 分鐘`);
    }
    const sorted = [...valid].sort(([, a], [, b]) => totalCost(a.travel_times_minutes) - totalCost(b.travel_times_minutes));
    console.log(`    → 最優解：${sorted[0][0]}`);

    // 路線順序是否相同
    const orders = valid.map(([, r]) => r.order.join(","));
    const allSame = orders.every((o) => o === orders[0]);
    console.log(`    路線順序：${allSame ? "✓ 所有方法相同" : "✗ 有差異"}`);
    if (!allSame) {
      valid.forEach(([name, r]) => console.log(`      ${name.padEnd(15)} ${r.order.map((id) => idToName[id].slice(0, 4)).join(" → ")}`));
    }
  }
}

// ── 主程式 ────────────────────────────────────────────────────
async function main() {
  console.log(`\nTSP 求解比較測試`);
  console.log(`ORS API Key：${ORS_API_KEY ? "✓" : "✗ 未設定"}`);
  console.log(`Python 服務：${PYTHON_URL}（可選）`);

  for (const [label, activities] of [
    ["無時間窗口（6個台北景點）", BASE_ACTIVITIES],
    ["有時間窗口（開放時間限制）", WITH_WINDOWS],
  ]) {
    const greedy = { ...greedyTSP(activities), elapsed: "0.00" };
    const [ortools, ors] = await Promise.all([
      callORTools(activities),
      callOrsVroom(activities),
    ]);

    printComparison(activities, [
      ["Haversine Greedy", greedy],
      ["OR-Tools (Python)", ortools],
      ["ORS Vroom",        ors],
    ], label);
  }
  console.log();
}

main().catch(console.error);
