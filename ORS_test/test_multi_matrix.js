/**
 * 多組測試：OR-Tools vs ORS Vroom + Google Matrix
 * 涵蓋不同活動數量、不同城市、不同時間窗口密度
 *
 * 執行：node ORS_test/test_multi_matrix.js
 */

import { ORS_API_KEY, GOOGLE_API_KEY, hhmmToSeconds, divider } from "./utils.js";

const MODE = "driving";
const PYTHON_URL = process.env.PYTHON_OPTIMIZE_URL ?? "http://localhost:8000";

// ── 測試資料集 ────────────────────────────────────────────────

const CASES = [
  {
    label: "Case 1 — 台北 4 點，無時間窗口",
    activities: [
      { id: "b1", title: "故宮",     lat: 25.1023, lng: 121.5484, duration_minutes: 120, time: "09:00" },
      { id: "b2", title: "101",      lat: 25.0338, lng: 121.5645, duration_minutes: 60,  time: "11:00" },
      { id: "b3", title: "龍山寺",   lat: 25.0373, lng: 121.4997, duration_minutes: 45,  time: "13:00" },
      { id: "b4", title: "士林夜市", lat: 25.0877, lng: 121.5241, duration_minutes: 90,  time: "17:00" },
    ],
  },
  {
    label: "Case 2 — 台北 8 點，無時間窗口",
    activities: [
      { id: "c1", title: "故宮",       lat: 25.1023, lng: 121.5484, duration_minutes: 120, time: "09:00" },
      { id: "c2", title: "101",        lat: 25.0338, lng: 121.5645, duration_minutes: 60,  time: "11:00" },
      { id: "c3", title: "龍山寺",     lat: 25.0373, lng: 121.4997, duration_minutes: 45,  time: "13:00" },
      { id: "c4", title: "士林夜市",   lat: 25.0877, lng: 121.5241, duration_minutes: 90,  time: "17:00" },
      { id: "c5", title: "台灣博物館", lat: 25.0448, lng: 121.5128, duration_minutes: 60,  time: "14:30" },
      { id: "c6", title: "象山",       lat: 25.0273, lng: 121.5770, duration_minutes: 75,  time: "16:00" },
      { id: "c7", title: "大安森林",   lat: 25.0298, lng: 121.5350, duration_minutes: 45,  time: "10:00" },
      { id: "c8", title: "西門町",     lat: 25.0424, lng: 121.5079, duration_minutes: 60,  time: "15:00" },
    ],
  },
  {
    label: "Case 3 — 台北 6 點，全部有時間窗口",
    activities: [
      { id: "d1", title: "故宮",       lat: 25.1023, lng: 121.5484, duration_minutes: 120, time: "09:00", opening_hours: { open: "08:30", close: "18:00" } },
      { id: "d2", title: "101",        lat: 25.0338, lng: 121.5645, duration_minutes: 60,  time: "11:00", opening_hours: { open: "11:00", close: "22:00" } },
      { id: "d3", title: "龍山寺",     lat: 25.0373, lng: 121.4997, duration_minutes: 45,  time: "13:00", opening_hours: { open: "06:00", close: "22:00" } },
      { id: "d4", title: "士林夜市",   lat: 25.0877, lng: 121.5241, duration_minutes: 90,  time: "17:00", opening_hours: { open: "17:00", close: "23:59" } },
      { id: "d5", title: "台灣博物館", lat: 25.0448, lng: 121.5128, duration_minutes: 60,  time: "09:00", opening_hours: { open: "09:30", close: "17:00" } },
      { id: "d6", title: "象山",       lat: 25.0273, lng: 121.5770, duration_minutes: 75,  time: "16:00", opening_hours: { open: "00:00", close: "23:59" } },
    ],
  },
  {
    label: "Case 4 — 台北 8 點，全部有時間窗口",
    activities: [
      { id: "e1", title: "故宮",       lat: 25.1023, lng: 121.5484, duration_minutes: 120, time: "09:00", opening_hours: { open: "08:30", close: "18:00" } },
      { id: "e2", title: "101",        lat: 25.0338, lng: 121.5645, duration_minutes: 60,  time: "11:00", opening_hours: { open: "11:00", close: "22:00" } },
      { id: "e3", title: "龍山寺",     lat: 25.0373, lng: 121.4997, duration_minutes: 45,  time: "13:00", opening_hours: { open: "06:00", close: "22:00" } },
      { id: "e4", title: "士林夜市",   lat: 25.0877, lng: 121.5241, duration_minutes: 90,  time: "17:00", opening_hours: { open: "17:00", close: "23:59" } },
      { id: "e5", title: "台灣博物館", lat: 25.0448, lng: 121.5128, duration_minutes: 60,  time: "09:00", opening_hours: { open: "09:30", close: "17:00" } },
      { id: "e6", title: "象山",       lat: 25.0273, lng: 121.5770, duration_minutes: 75,  time: "16:00", opening_hours: { open: "00:00", close: "23:59" } },
      { id: "e7", title: "大安森林",   lat: 25.0298, lng: 121.5350, duration_minutes: 45,  time: "10:00", opening_hours: { open: "06:00", close: "22:00" } },
      { id: "e8", title: "西門町",     lat: 25.0424, lng: 121.5079, duration_minutes: 60,  time: "15:00", opening_hours: { open: "10:00", close: "23:00" } },
    ],
  },
  {
    label: "Case 5 — 京都 5 點，有時間窗口（測試非台灣城市）",
    activities: [
      { id: "f1", title: "金閣寺",   lat: 35.0394, lng: 135.7292, duration_minutes: 60,  time: "09:00", opening_hours: { open: "09:00", close: "17:00" } },
      { id: "f2", title: "嵐山",     lat: 35.0168, lng: 135.6772, duration_minutes: 90,  time: "10:30", opening_hours: { open: "00:00", close: "23:59" } },
      { id: "f3", title: "清水寺",   lat: 34.9949, lng: 135.7851, duration_minutes: 75,  time: "13:00", opening_hours: { open: "06:00", close: "18:00" } },
      { id: "f4", title: "伏見稻荷", lat: 34.9671, lng: 135.7727, duration_minutes: 90,  time: "15:00", opening_hours: { open: "00:00", close: "23:59" } },
      { id: "f5", title: "祇園",     lat: 35.0037, lng: 135.7758, duration_minutes: 60,  time: "17:00", opening_hours: { open: "10:00", close: "22:00" } },
    ],
  },
  {
    label: "Case 6 — 台北 10 點，混合時間窗口（壓力測試）",
    activities: [
      { id: "g1",  title: "故宮",       lat: 25.1023, lng: 121.5484, duration_minutes: 90,  time: "09:00", opening_hours: { open: "08:30", close: "18:00" } },
      { id: "g2",  title: "101",        lat: 25.0338, lng: 121.5645, duration_minutes: 45,  time: "11:00", opening_hours: { open: "11:00", close: "22:00" } },
      { id: "g3",  title: "龍山寺",     lat: 25.0373, lng: 121.4997, duration_minutes: 30,  time: "13:00" },
      { id: "g4",  title: "士林夜市",   lat: 25.0877, lng: 121.5241, duration_minutes: 90,  time: "17:00", opening_hours: { open: "17:00", close: "23:59" } },
      { id: "g5",  title: "台灣博物館", lat: 25.0448, lng: 121.5128, duration_minutes: 60,  time: "09:00", opening_hours: { open: "09:30", close: "17:00" } },
      { id: "g6",  title: "象山",       lat: 25.0273, lng: 121.5770, duration_minutes: 60,  time: "16:00" },
      { id: "g7",  title: "大安森林",   lat: 25.0298, lng: 121.5350, duration_minutes: 45,  time: "10:00" },
      { id: "g8",  title: "西門町",     lat: 25.0424, lng: 121.5079, duration_minutes: 60,  time: "15:00", opening_hours: { open: "10:00", close: "23:00" } },
      { id: "g9",  title: "中正紀念堂", lat: 25.0353, lng: 121.5215, duration_minutes: 45,  time: "10:30", opening_hours: { open: "09:00", close: "18:00" } },
      { id: "g10", title: "饒河夜市",   lat: 25.0510, lng: 121.5776, duration_minutes: 90,  time: "18:00", opening_hours: { open: "17:00", close: "23:59" } },
    ],
  },
];

// ── Google Distance Matrix ─────────────────────────────────────
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

// ── OR-Tools ──────────────────────────────────────────────────
async function callORTools(activities) {
  try {
    const t0 = Date.now();
    const res = await fetch(`${PYTHON_URL}/optimize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activities, mode: MODE, start_time: "09:00", end_time: "20:00" }),
      signal: AbortSignal.timeout(20000),
    });
    const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
    if (!res.ok) return null;
    return { ...(await res.json()), elapsed };
  } catch { return null; }
}

// ── ORS Vroom + Google Matrix ─────────────────────────────────
async function callVroom(activities, matrix) {
  const profile = "driving-car";
  const jobs = activities.map((act, i) => {
    const job = { id: i + 1, location_index: i, service: act.duration_minutes * 60 };
    if (act.opening_hours) {
      job.time_windows = [[hhmmToSeconds(act.opening_hours.open), hhmmToSeconds(act.opening_hours.close)]];
    }
    return job;
  });
  const vehicles = [{
    id: 1, profile, start_index: 0,
    time_window: [hhmmToSeconds("09:00"), hhmmToSeconds("20:00")],
  }];
  const t0 = Date.now();
  const res = await fetch("https://api.openrouteservice.org/optimization", {
    method: "POST",
    headers: { Authorization: ORS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ jobs, vehicles, matrices: { [profile]: { durations: matrix } } }),
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
  if (!res.ok) { console.log(`  Vroom error ${res.status}`); return null; }
  const data = await res.json();
  const steps = data.routes?.[0]?.steps?.filter((s) => s.type === "job") ?? [];
  return {
    order: steps.map((s) => activities[s.id - 1].id),
    steps,
    elapsed,
    unassigned: data.unassigned ?? [],
  };
}

// ── 模擬時間軸 ────────────────────────────────────────────────
function simulate(order, activities, matrix) {
  const idToAct = Object.fromEntries(activities.map((a) => [a.id, a]));
  const idToIdx = Object.fromEntries(activities.map((a, i) => [a.id, i]));

  let time = 9 * 3600;
  let totalTravel = 0, totalWait = 0;
  const violations = [];
  const schedule = [];

  order.forEach((id, i) => {
    const act = idToAct[id];
    const travelSec = i === 0 ? 0 : matrix[idToIdx[order[i - 1]]][idToIdx[id]];
    totalTravel += travelSec;
    const arrival = time + travelSec;
    const open  = act.opening_hours ? hhmmToSeconds(act.opening_hours.open)  : 0;
    const close = act.opening_hours ? hhmmToSeconds(act.opening_hours.close) : 86400;
    const wait  = Math.max(0, open - arrival);
    totalWait += wait;
    const start  = arrival + wait;
    const depart = start + act.duration_minutes * 60;
    if (arrival > close || depart > close + 15 * 60) violations.push(act.title);
    schedule.push({ title: act.title, arrival, wait, start, depart, open, close });
    time = depart;
  });

  return {
    totalTravel: Math.round(totalTravel / 60),
    totalWait:   Math.round(totalWait / 60),
    endTime: time,
    violations,
    schedule,
  };
}

function secToHHMM(s) {
  return `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}`;
}

// ── 印結果 ────────────────────────────────────────────────────
function printCaseResult(label, ortResult, vroomResult, activities, matrix) {
  const idToName = Object.fromEntries(activities.map((a) => [a.id, a.title]));
  const hasWindows = activities.some((a) => a.opening_hours);

  console.log(`\n${divider()}`);
  console.log(`  ${label}`);
  console.log(`  活動數：${activities.length}  時間窗口：${hasWindows ? "有" : "無"}`);
  console.log(divider());

  const rows = [];

  for (const [name, result, elapsed] of [
    ["OR-Tools", ortResult, ortResult?.elapsed],
    ["Vroom",    vroomResult, vroomResult?.elapsed],
  ]) {
    if (!result) {
      console.log(`  [${name}] ✗ 無結果`);
      rows.push(null);
      continue;
    }
    const sim = simulate(result.order, activities, matrix);
    const unassigned = result.unassigned?.length ?? 0;
    const orderStr = result.order.map((id) => idToName[id].slice(0, 4)).join(" → ");

    console.log(`\n  [${name}]  (${elapsed}s)`);
    console.log(`    路線：${orderStr}`);

    // 時間表
    console.log(`    ${"地點".padEnd(10)} ${"抵達".padStart(5)} ${"等待".padStart(5)} ${"離開".padStart(5)} ${"窗口".padStart(13)} ${"✓".padStart(3)}`);
    sim.schedule.forEach((s) => {
      const ok = !sim.violations.includes(s.title) ? "✓" : "✗";
      const wait = s.wait > 0 ? `${Math.round(s.wait/60)}m` : "—";
      const window = s.open > 0 || s.close < 86400 ? `${secToHHMM(s.open)}-${secToHHMM(s.close)}` : "無限制";
      console.log(`    ${s.title.slice(0,8).padEnd(10)} ${secToHHMM(s.arrival).padStart(5)} ${wait.padStart(5)} ${secToHHMM(s.depart).padStart(5)} ${window.padStart(13)} ${ok.padStart(3)}`);
    });

    console.log(`    行駛 ${sim.totalTravel}min  等待 ${sim.totalWait}min  結束 ${secToHHMM(sim.endTime)}  違規 ${sim.violations.length}`);
    if (unassigned > 0) console.log(`    ⚠ 未排入 ${unassigned} 個活動`);

    rows.push({ name, travel: sim.totalTravel, wait: sim.totalWait, total: sim.totalTravel + sim.totalWait, violations: sim.violations.length, unassigned });
  }

  // 比較行
  const [r1, r2] = rows;
  if (r1 && r2) {
    const tDiff = r1.travel - r2.travel;
    const wDiff = r1.wait - r2.wait;
    const totalDiff = r1.total - r2.total;
    const sameOrder = ortResult.order.join() === vroomResult.order.join();
    console.log(`\n  比較：行駛差 ${tDiff > 0 ? "+" : ""}${tDiff}min  等待差 ${wDiff > 0 ? "+" : ""}${wDiff}min  總差 ${totalDiff > 0 ? "+" : ""}${totalDiff}min  路線${sameOrder ? "相同 ✓" : "不同 ✗"}`);
    console.log(`        OR-Tools 違規 ${r1.violations}  Vroom 違規 ${r2.violations}`);
    return { tDiff, wDiff, totalDiff, sameOrder, ortViolations: r1.violations, vroomViolations: r2.violations };
  }
  return null;
}

// ── 主程式 ────────────────────────────────────────────────────
async function main() {
  console.log(`\n多組矩陣比較測試（OR-Tools vs ORS Vroom + Google Matrix）`);
  console.log(`Python：${PYTHON_URL}  |  ${GOOGLE_API_KEY ? "Google ✓" : "Google ✗"}  |  ${ORS_API_KEY ? "ORS ✓" : "ORS ✗"}\n`);

  const summary = [];

  for (const tc of CASES) {
    const matrix = await getGoogleMatrix(tc.activities);
    if (!matrix) { console.log(`  [跳過] ${tc.label}：Google Matrix 失敗`); continue; }
    const [ort, vroom] = await Promise.all([callORTools(tc.activities), callVroom(tc.activities, matrix)]);
    const diff = printCaseResult(tc.label, ort, vroom, tc.activities, matrix);
    if (diff) summary.push({ label: tc.label, ...diff });
  }

  // 總覽
  console.log(`\n${"=".repeat(62)}`);
  console.log(`  總覽（正數 = OR-Tools 較差，負數 = OR-Tools 較優）`);
  console.log(`${"=".repeat(62)}`);
  console.log(`  ${"Case".padEnd(34)} ${"行駛".padStart(6)} ${"等待".padStart(6)} ${"總計".padStart(6)} ${"路線".padStart(6)} ${"違規".padStart(6)}`);
  summary.forEach((r) => {
    const same = r.sameOrder ? "同" : "異";
    const vio = r.ortViolations === 0 && r.vroomViolations === 0 ? "皆0" : `OR${r.ortViolations}/V${r.vroomViolations}`;
    console.log(`  ${r.label.slice(0,32).padEnd(34)} ${String(r.tDiff).padStart(6)} ${String(r.wDiff).padStart(6)} ${String(r.totalDiff).padStart(6)} ${same.padStart(6)} ${vio.padStart(6)}`);
  });
  const avgTotal = summary.reduce((s, r) => s + r.totalDiff, 0) / summary.length;
  console.log(`  ${"平均".padEnd(34)} ${"".padStart(6)} ${"".padStart(6)} ${avgTotal.toFixed(1).padStart(6)}`);
  console.log();
}

main().catch(console.error);
