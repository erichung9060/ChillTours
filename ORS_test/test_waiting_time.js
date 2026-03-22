/**
 * 測試 Vroom waiting_time 定義
 *
 * 設計一個已知會有等待時間的場景：
 *   A: 09:00 出發，停留 60min
 *   B: 有 time_window [12:00, 18:00]，但行駛只需 10min（10:00 就到）
 *      → 預期等待 2 小時
 *   C: 無限制
 *
 * 驗證：
 *   1. steps[B].waiting_time == 7200 (秒)
 *   2. steps[B].arrival + waiting_time + service == steps[C].arrival - travel(B→C)
 *   3. 我們的公式 travel = steps[k+1].arrival - s.arrival - s.waiting_time - s.service
 *      是否等於矩陣中的真實行駛秒數
 */

import { ORS_API_KEY } from "./utils.js";
const ORS_URL = "https://api.openrouteservice.org/optimization";

// 三個地點（台北，距離相近，行駛約 10min）
const locations = [
  { name: "A 台北車站",    lat: 25.0478, lng: 121.5171 },
  { name: "B 國立故宮博物院", lat: 25.1023, lng: 121.5485 }, // 距A約25min
  { name: "C 西門町",      lat: 25.0420, lng: 121.5079 },
];

// 手動建一個 3×3 矩陣（秒），模擬已知行駛時間
// A→B = 25min, B→C = 30min, A→C = 10min
const matrix = [
  [0,     25*60, 10*60],
  [25*60, 0,     30*60],
  [10*60, 25*60, 0    ],
];

function fmt(sec) {
  const h = Math.floor(sec / 3600).toString().padStart(2, "0");
  const m = Math.floor((sec % 3600) / 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

async function main() {
  const jobs = [
    {
      id: 1,
      location_index: 0, // A
      service: 60 * 60,  // 60min
      // 無 time_window
    },
    {
      id: 2,
      location_index: 1, // B 故宮
      service: 90 * 60,  // 90min
      time_windows: [[12 * 3600, 17 * 3600]], // 12:00–17:00
      // 從 A 出發 09:00 + 60min service + 25min travel = 10:25 到 B
      // 但 B 開門 12:00 → 預期等待 ~95min
    },
    {
      id: 3,
      location_index: 2, // C
      service: 60 * 60,
      // 無 time_window
    },
  ];

  const vehicles = [
    {
      id: 1,
      profile: "driving-car",
      start_index: 0,
      time_window: [9 * 3600, 21 * 3600],
    },
  ];

  console.log("=== Vroom waiting_time 定義測試 ===\n");
  console.log("已知行駛時間（矩陣）：");
  console.log("  A→B = 25min, B→C = 30min, A→C = 10min");
  console.log("\n預期行程：");
  console.log("  A: 09:00 開始服務 (60min) → 離開 10:00");
  console.log("  B: 10:00 + 25min travel = 10:25 抵達，但開門 12:00 → 等待 95min，服務 12:00–13:30");
  console.log("  C: 13:30 + 30min travel = 14:00 抵達\n");

  const res = await fetch(ORS_URL, {
    method: "POST",
    headers: {
      Authorization: ORS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jobs,
      vehicles,
      matrices: { "driving-car": { durations: matrix } },
    }),
  });

  if (!res.ok) {
    console.error("ORS error:", res.status, await res.text());
    return;
  }

  const data = await res.json();
  const steps = data.routes[0].steps;

  console.log("=== Vroom 原始 steps ===");
  for (const s of steps) {
    console.log(`\ntype=${s.type} id=${s.id ?? "-"}`);
    console.log(`  arrival      = ${s.arrival}s  (${fmt(s.arrival)})`);
    console.log(`  waiting_time = ${s.waiting_time}s  (${Math.round(s.waiting_time / 60)}min)`);
    console.log(`  service      = ${s.service}s  (${Math.round(s.service / 60)}min)`);
    console.log(`  departure    = arrival + waiting + service = ${s.arrival + s.waiting_time + s.service}s  (${fmt(s.arrival + s.waiting_time + s.service)})`);
  }

  // 只看 job steps
  const jobSteps = steps.filter((s) => s.type === "job");
  console.log("\n=== 公式驗證 ===");
  for (let k = 0; k < jobSteps.length - 1; k++) {
    const s = jobSteps[k];
    const next = jobSteps[k + 1];
    const name = locations[s.id - 1].name;
    const nextName = locations[next.id - 1].name;

    const ourFormula = next.arrival - s.arrival - s.waiting_time - s.service;
    const matrixVal  = matrix[s.id - 1][next.id - 1];
    const oldFormula = next.arrival - s.arrival - s.service; // 舊公式（含 waiting）

    console.log(`\n${name} → ${nextName}`);
    console.log(`  矩陣行駛時間             = ${matrixVal}s (${Math.round(matrixVal / 60)}min)`);
    console.log(`  新公式（-waiting_time）   = ${ourFormula}s (${Math.round(ourFormula / 60)}min)  ${ourFormula === matrixVal ? "✓ 正確" : "✗ 不符"}`);
    console.log(`  舊公式（未扣waiting）     = ${oldFormula}s (${Math.round(oldFormula / 60)}min)`);
  }
}

main().catch(console.error);
