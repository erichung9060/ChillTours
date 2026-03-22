/**
 * 驗證 OR-Tools 和 ORS Vroom 的解是否符合時間窗口與停留時間
 * 用 Google Distance Matrix 模擬完整時間軸
 *
 * 執行：node ORS_test/test_verify_schedule.js
 */

import { ORS_API_KEY, GOOGLE_API_KEY, hhmmToSeconds, divider } from "./utils.js";

const MODE = "driving";
const PYTHON_URL = process.env.PYTHON_OPTIMIZE_URL ?? "http://localhost:8000";

const ACTIVITIES = [
  { id: "a1", title: "國立故宮博物院", lat: 25.1023, lng: 121.5484, duration_minutes: 120, time: "09:00", opening_hours: { open: "08:30", close: "18:00" } },
  { id: "a2", title: "台北 101",       lat: 25.0338, lng: 121.5645, duration_minutes: 60,  time: "11:00", opening_hours: { open: "11:00", close: "22:00" } },
  { id: "a3", title: "龍山寺",         lat: 25.0373, lng: 121.4997, duration_minutes: 45,  time: "13:00", opening_hours: { open: "06:00", close: "22:00" } },
  { id: "a4", title: "士林夜市",       lat: 25.0877, lng: 121.5241, duration_minutes: 90,  time: "17:00", opening_hours: { open: "17:00", close: "23:59" } },
  { id: "a5", title: "國立台灣博物館", lat: 25.0448, lng: 121.5128, duration_minutes: 60,  time: "09:00", opening_hours: { open: "09:30", close: "17:00" } },
  { id: "a6", title: "象山",           lat: 25.0273, lng: 121.5770, duration_minutes: 75,  time: "16:00", opening_hours: { open: "00:00", close: "23:59" } },
];

function secToHHMM(sec) {
  const h = String(Math.floor(sec / 3600)).padStart(2, "0");
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  return `${h}:${m}`;
}

// ── 取 Google Distance Matrix（秒）───────────────────────────
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
    const res = await fetch(`${PYTHON_URL}/optimize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activities, mode: MODE, start_time: "09:00", end_time: "20:00" }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// ── ORS Vroom + Google Matrix ─────────────────────────────────
async function callVroom(activities, googleMatrix) {
  const profile = "driving-car";
  const jobs = activities.map((act, i) => ({
    id: i + 1,
    location_index: i,
    service: act.duration_minutes * 60,
    time_windows: [[hhmmToSeconds(act.opening_hours.open), hhmmToSeconds(act.opening_hours.close)]],
  }));
  const vehicles = [{
    id: 1, profile, start_index: 0,
    time_window: [hhmmToSeconds("09:00"), hhmmToSeconds("20:00")],
  }];
  const res = await fetch("https://api.openrouteservice.org/optimization", {
    method: "POST",
    headers: { Authorization: ORS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ jobs, vehicles, matrices: { [profile]: { durations: googleMatrix } } }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const steps = data.routes?.[0]?.steps?.filter((s) => s.type === "job") ?? [];
  return {
    order: steps.map((s) => activities[s.id - 1].id),
    vroomSteps: steps,
    unassigned: data.unassigned ?? [],
  };
}

// ── 核心：模擬時間軸並驗證 ───────────────────────────────────
function simulateAndVerify(label, order, activities, googleMatrix, dayStartSec = 9 * 3600) {
  const idToAct = Object.fromEntries(activities.map((a) => [a.id, a]));
  const idToIdx = Object.fromEntries(activities.map((a, i) => [a.id, i]));

  console.log(`\n${"─".repeat(62)}`);
  console.log(`  ${label}`);
  console.log(`${"─".repeat(62)}`);
  console.log(`  ${"地點".padEnd(12)} ${"抵達".padStart(5)} ${"等待".padStart(5)} ${"開始".padStart(5)} ${"離開".padStart(5)} ${"時間窗口".padStart(13)} ${"符合".padStart(4)}`);
  console.log(`  ${"─".repeat(58)}`);

  let currentTime = dayStartSec;
  let totalTravel = 0;
  let totalWait = 0;
  let violations = [];

  order.forEach((id, i) => {
    const act = idToAct[id];
    const open = hhmmToSeconds(act.opening_hours.open);
    const close = hhmmToSeconds(act.opening_hours.close);

    // 行車時間
    let travelSec = 0;
    if (i > 0) {
      travelSec = googleMatrix[idToIdx[order[i - 1]]][idToIdx[id]];
      totalTravel += travelSec;
    }

    const arrivalTime = currentTime + travelSec;

    // 等待（若提早到）
    const waitSec = Math.max(0, open - arrivalTime);
    totalWait += waitSec;

    const startTime = arrivalTime + waitSec;
    const departTime = startTime + act.duration_minutes * 60;

    // 驗證
    const arriveTooLate = arrivalTime > close;           // 超過關門才到
    const departTooLate = departTime > close + 15 * 60; // 離開時超過關門 15min 容忍
    const ok = !arriveTooLate && !departTooLate;

    if (!ok) violations.push({ title: act.title, issue: arriveTooLate ? "抵達時已關門" : "無法在關門前完成" });

    const status = ok ? "✓" : "✗";
    const window = `${secToHHMM(open)}-${secToHHMM(close)}`;
    const waitStr = waitSec > 0 ? `${Math.round(waitSec / 60)}min` : "—";

    console.log(`  ${act.title.slice(0, 10).padEnd(12)} ${secToHHMM(arrivalTime).padStart(5)} ${waitStr.padStart(5)} ${secToHHMM(startTime).padStart(5)} ${secToHHMM(departTime).padStart(5)} ${window.padStart(13)} ${status.padStart(4)}`);

    currentTime = departTime;
  });

  const endTime = currentTime;
  const dayEnd = 20 * 3600;

  console.log(`  ${"─".repeat(58)}`);
  console.log(`  結束時間：${secToHHMM(endTime)}  ${endTime <= dayEnd ? "✓ 在 20:00 前" : "✗ 超過 20:00"}`);
  console.log(`  總行駛：${Math.round(totalTravel / 60)} 分鐘`);
  console.log(`  總等待：${Math.round(totalWait / 60)} 分鐘`);
  console.log(`  總耗時：${Math.round((endTime - dayStartSec) / 60)} 分鐘（含停留+行駛+等待）`);

  if (violations.length) {
    console.log(`\n  ⚠ 違規 ${violations.length} 項：`);
    violations.forEach((v) => console.log(`    ✗ ${v.title}：${v.issue}`));
  } else {
    console.log(`\n  ✓ 所有時間窗口皆符合，無違規`);
  }

  return { totalTravel: Math.round(totalTravel / 60), totalWait: Math.round(totalWait / 60), violations };
}

// ── 主程式 ────────────────────────────────────────────────────
async function main() {
  console.log(`\n時間窗口 & 停留時間驗證`);
  console.log(`（用 Google Distance Matrix 模擬實際時間軸）\n`);

  const matrix = await getGoogleMatrix(ACTIVITIES);
  if (!matrix) { console.log("Google Matrix 失敗"); return; }

  const [ort, vroom] = await Promise.all([
    callORTools(ACTIVITIES),
    callVroom(ACTIVITIES, matrix),
  ]);

  console.log(divider());
  console.log("  各方法回傳的路線順序");
  console.log(divider());
  const idToName = Object.fromEntries(ACTIVITIES.map((a) => [a.id, a.title]));
  if (ort)   console.log(`  OR-Tools：${ort.order.map((id) => idToName[id].slice(0, 4)).join(" → ")}`);
  else       console.log(`  OR-Tools：✗ Python 服務未啟動`);
  if (vroom) console.log(`  Vroom：   ${vroom.order.map((id) => idToName[id].slice(0, 4)).join(" → ")}`);
  if (vroom?.unassigned?.length) console.log(`  ⚠ Vroom 未排入：${vroom.unassigned.length} 個`);

  // 驗證兩者
  console.log(`\n${divider()}`);
  console.log("  時間軸模擬（日行程 09:00–20:00）");

  const results = [];
  if (ort)   results.push(simulateAndVerify("OR-Tools",              ort.order,   ACTIVITIES, matrix));
  if (vroom) results.push(simulateAndVerify("ORS Vroom + Google Matrix", vroom.order, ACTIVITIES, matrix));

  // 總結比較
  if (results.length === 2 && ort && vroom) {
    console.log(`\n${divider()}`);
    console.log("  總結比較");
    console.log(divider());
    console.log(`  ${"".padEnd(20)} ${"OR-Tools".padStart(10)} ${"Vroom".padStart(10)}`);
    console.log(`  ${"行駛時間(min)".padEnd(20)} ${String(results[0].totalTravel).padStart(10)} ${String(results[1].totalTravel).padStart(10)}`);
    console.log(`  ${"等待時間(min)".padEnd(20)} ${String(results[0].totalWait).padStart(10)} ${String(results[1].totalWait).padStart(10)}`);
    console.log(`  ${"違規項目".padEnd(20)} ${String(results[0].violations.length).padStart(10)} ${String(results[1].violations.length).padStart(10)}`);
    console.log(`  ${"時間窗口全符合".padEnd(20)} ${(results[0].violations.length === 0 ? "✓" : "✗").padStart(10)} ${(results[1].violations.length === 0 ? "✓" : "✗").padStart(10)}`);
  }
  console.log();
}

main().catch(console.error);
