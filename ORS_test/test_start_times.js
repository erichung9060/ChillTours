/**
 * Test: start_times 驗證
 * 呼叫 Next.js /api/optimize-route（快速）和 /api/optimize-route-full（完整）
 * 驗證：
 *   1. 回應包含 start_times 陣列，長度與 order 一致
 *   2. 用餐類型活動的開始時間落在用餐時段內
 *   3. 有 opening_hours 的活動開始時間不早於開門時間
 *   4. start_times 按時間順序遞增（無回頭現象）
 *
 * 執行：node ORS_test/test_start_times.js
 * 前提：npm run dev 必須在執行中（http://localhost:3000）
 */

import { NEXT_APP_URL, hhmmToSeconds, divider } from "./utils.js";

const OPTIMIZE_URL      = `${NEXT_APP_URL}/api/optimize-route`;
const OPTIMIZE_FULL_URL = `${NEXT_APP_URL}/api/optimize-route-full`;

// 測試資料：含用餐、開放時間窗口、固定時間三種類型
const ACTIVITIES_BASIC = [
  { id: "a1", title: "國立故宮博物院", lat: 25.1023, lng: 121.5484, duration_minutes: 120, time: "09:00", importance: "preferred" },
  { id: "a2", title: "台北101",        lat: 25.0338, lng: 121.5645, duration_minutes: 60,  time: "11:00", importance: "preferred" },
  { id: "a3", title: "龍山寺",         lat: 25.0373, lng: 121.4997, duration_minutes: 45,  time: "13:00", importance: "preferred" },
  { id: "a4", title: "士林夜市",       lat: 25.0877, lng: 121.5241, duration_minutes: 90,  time: "18:00", importance: "preferred" },
];

const ACTIVITIES_WITH_WINDOWS = [
  { id: "b1", title: "國立故宮博物院", lat: 25.1023, lng: 121.5484, duration_minutes: 120, time: "09:00", opening_hours: { open: "08:30", close: "18:00" } },
  { id: "b2", title: "台北101",        lat: 25.0338, lng: 121.5645, duration_minutes: 60,  time: "11:00", opening_hours: { open: "11:00", close: "22:00" } },
  { id: "b3", title: "龍山寺",         lat: 25.0373, lng: 121.4997, duration_minutes: 45,  time: "06:30", opening_hours: { open: "06:00", close: "22:00" } },
  { id: "b4", title: "士林夜市",       lat: 25.0877, lng: 121.5241, duration_minutes: 90,  time: "17:30", opening_hours: { open: "17:00", close: "23:59" } },
  { id: "b5", title: "午餐",           lat: 25.0500, lng: 121.5300, duration_minutes: 60,  time: "12:00", type: "lunch" },
];

const ACTIVITIES_FULL = [
  { id: "c1", title: "國立故宮博物院",   lat: 25.10,  lng: 121.55, duration_minutes: 120, time: "09:00" },
  { id: "c2", title: "台北101",          lat: 25.03,  lng: 121.56, duration_minutes: 60,  time: "12:00" },
  { id: "c3", title: "龍山寺",           lat: 25.037, lng: 121.50, duration_minutes: 45,  time: "14:00" },
  { id: "c4", title: "象山",             lat: 25.027, lng: 121.58, duration_minutes: 75,  time: "16:00" },
];

function secToHHMM(sec) {
  const h = String(Math.floor(sec / 3600)).padStart(2, "0");
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  return `${h}:${m}`;
}

function checkMark(ok) { return ok ? "✓" : "✗"; }

async function callOptimize(url, payload) {
  const t0 = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return { data: await res.json(), elapsed };
}

// ── 驗證 start_times ─────────────────────────────────────────
function verifyStartTimes(label, activities, order, startTimes, mealWindows = {}) {
  console.log(`\n  ${"─".repeat(60)}`);
  console.log(`  ${label}`);
  console.log(`  ${"─".repeat(60)}`);

  const idToAct = Object.fromEntries(activities.map((a) => [a.id, a]));

  let pass = 0;
  let fail = 0;

  // 長度一致
  const lenOk = order.length === startTimes.length;
  console.log(`  ${checkMark(lenOk)} order 長度(${order.length}) == start_times 長度(${startTimes.length})`);
  lenOk ? pass++ : fail++;

  // 列印每個活動的時間
  console.log();
  console.log(`  ${"活動".padEnd(14)} ${"start_time".padStart(10)} ${"限制".padStart(14)} ${"符合".padStart(4)}`);
  console.log(`  ${"─".repeat(46)}`);

  let prevSec = 0;
  let monotonic = true;

  for (let i = 0; i < order.length; i++) {
    const id = order[i];
    const act = idToAct[id];
    const st = startTimes[i];
    if (!act || !st) {
      console.log(`  ${"(missing)".padEnd(14)} ${"?".padStart(10)} ${"".padStart(14)} ${"✗".padStart(4)}`);
      fail++;
      continue;
    }

    const stSec = hhmmToSeconds(st);

    // 單調遞增
    if (i > 0 && stSec < prevSec) monotonic = false;
    prevSec = stSec;

    // 檢查限制
    let constraint = "";
    let ok = true;

    if (act.type && mealWindows[act.type]) {
      const w = mealWindows[act.type];
      const openSec = hhmmToSeconds(w.open);
      const closeSec = hhmmToSeconds(w.close);
      constraint = `${w.open}–${w.close}(meal)`;
      ok = stSec >= openSec && stSec <= closeSec;
    } else if (act.opening_hours) {
      const openSec = hhmmToSeconds(act.opening_hours.open);
      constraint = `≥${act.opening_hours.open}(open)`;
      ok = stSec >= openSec;
    } else if (act.flexible === false) {
      const fixedSec = hhmmToSeconds(act.time);
      constraint = `=${act.time}(fixed)`;
      ok = stSec === fixedSec;
    } else {
      constraint = "(free)";
    }

    console.log(`  ${(act.title ?? id).slice(0, 12).padEnd(14)} ${st.padStart(10)} ${constraint.padStart(14)} ${checkMark(ok).padStart(4)}`);
    ok ? pass++ : fail++;
  }

  // 單調遞增
  console.log();
  console.log(`  ${checkMark(monotonic)} start_times 單調遞增（無回頭）`);
  monotonic ? pass++ : fail++;

  return { pass, fail };
}

// ── 主程式 ────────────────────────────────────────────────────
async function main() {
  const MEAL_WINDOWS = {
    breakfast: { open: "07:00", close: "10:00" },
    lunch:     { open: "11:00", close: "14:00" },
    dinner:    { open: "17:30", close: "21:00" },
  };

  console.log(`\nstart_times 驗證測試`);
  console.log(`Next.js URL：${NEXT_APP_URL}`);

  let totalPass = 0;
  let totalFail = 0;

  // ── Case 1：快速優化（無時間窗）────────────────────────────
  console.log(`\n${divider()}`);
  console.log("  Case 1：快速優化（無時間窗）");
  console.log(divider());

  try {
    const { data, elapsed } = await callOptimize(OPTIMIZE_URL, {
      activities: ACTIVITIES_BASIC,
      mode: "driving",
      start_time: "09:00",
      end_time: "21:00",
    });
    console.log(`  耗時：${elapsed}s`);
    console.log(`  order：${(data.order ?? []).join(" → ")}`);
    console.log(`  start_times：[${(data.start_times ?? []).join(", ")}]`);
    const { pass, fail } = verifyStartTimes("驗證 start_times", ACTIVITIES_BASIC, data.order ?? [], data.start_times ?? [], MEAL_WINDOWS);
    totalPass += pass; totalFail += fail;
  } catch (err) {
    console.log(`  ✗ 呼叫失敗：${err.message}`);
    console.log(`  → 確認 npm run dev 已啟動（${NEXT_APP_URL}）`);
    totalFail++;
  }

  // ── Case 2：快速優化（含時間窗 + 用餐）─────────────────────
  console.log(`\n${divider()}`);
  console.log("  Case 2：快速優化（含 opening_hours + 用餐）");
  console.log(divider());

  try {
    const { data, elapsed } = await callOptimize(OPTIMIZE_URL, {
      activities: ACTIVITIES_WITH_WINDOWS,
      mode: "driving",
      start_time: "09:00",
      end_time: "21:00",
    });
    console.log(`  耗時：${elapsed}s`);
    console.log(`  order：${(data.order ?? []).join(" → ")}`);
    console.log(`  start_times：[${(data.start_times ?? []).join(", ")}]`);
    const { pass, fail } = verifyStartTimes("驗證 start_times", ACTIVITIES_WITH_WINDOWS, data.order ?? [], data.start_times ?? [], MEAL_WINDOWS);
    totalPass += pass; totalFail += fail;
  } catch (err) {
    console.log(`  ✗ 呼叫失敗：${err.message}`);
    totalFail++;
  }

  // ── Case 3：完整優化（Places 豐富化）───────────────────────
  console.log(`\n${divider()}`);
  console.log("  Case 3：完整優化（Places 豐富化 + start_times）");
  console.log(divider());

  try {
    const { data, elapsed } = await callOptimize(OPTIMIZE_FULL_URL, {
      activities: ACTIVITIES_FULL,
      mode: "driving",
      start_time: "09:00",
      end_time: "21:00",
      date: "2026-03-25",  // 週二
    });
    console.log(`  耗時：${elapsed}s（含 Places 查詢）`);
    console.log(`  order：${(data.order ?? []).join(" → ")}`);
    console.log(`  start_times：[${(data.start_times ?? []).join(", ")}]`);

    const hasEnriched = Array.isArray(data.enriched_activities) && data.enriched_activities.length > 0;
    console.log(`  ${checkMark(hasEnriched)} enriched_activities：${data.enriched_activities?.length ?? 0} 個`);
    if (hasEnriched) {
      totalPass++;
      // 顯示座標是否被更新
      for (const e of data.enriched_activities) {
        const orig = ACTIVITIES_FULL.find((a) => a.id === e.id);
        if (orig && e.lat != null) {
          const moved = Math.abs(orig.lat - e.lat) > 0.001 || Math.abs(orig.lng - e.lng) > 0.001;
          console.log(`    ${moved ? "△ 座標更新" : "─ 座標不變"} ${e.id}：(${e.lat?.toFixed(4)}, ${e.lng?.toFixed(4)}) place_id=${e.place_id ?? "無"}`);
        }
      }
    } else {
      totalFail++;
    }

    const { pass, fail } = verifyStartTimes("驗證 start_times（完整優化）", ACTIVITIES_FULL, data.order ?? [], data.start_times ?? [], MEAL_WINDOWS);
    totalPass += pass; totalFail += fail;
  } catch (err) {
    console.log(`  ✗ 呼叫失敗：${err.message}`);
    totalFail++;
  }

  // ── 總結 ──────────────────────────────────────────────────
  console.log(`\n${divider()}`);
  console.log(`  結果：${totalPass} 通過 / ${totalFail} 失敗`);
  if (totalFail === 0) {
    console.log("  ✓ 全部通過");
  } else {
    console.log("  ✗ 有失敗項目，請檢查上方細節");
  }
  console.log();
}

main().catch((err) => {
  console.error("未預期錯誤：", err);
  process.exit(1);
});
