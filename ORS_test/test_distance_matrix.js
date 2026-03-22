/**
 * Test 1: Distance Matrix 比較
 * Haversine（基準）vs Google Distance Matrix vs ORS Distance Matrix
 *
 * 執行：node ORS_test/test_distance_matrix.js
 */

import { ORS_API_KEY, GOOGLE_API_KEY, haversineMinutes, divider } from "./utils.js";

const MODE = "driving"; // driving | walking | bicycling | transit

const LOCATIONS = [
  { name: "國立故宮博物院", lat: 25.1023, lng: 121.5484 },
  { name: "台北 101",       lat: 25.0338, lng: 121.5645 },
  { name: "龍山寺",         lat: 25.0373, lng: 121.4997 },
  { name: "士林夜市",       lat: 25.0877, lng: 121.5241 },
  { name: "國立台灣博物館", lat: 25.0448, lng: 121.5128 },
  { name: "象山",           lat: 25.0273, lng: 121.5770 },
];

// ── Haversine 基準線 ──────────────────────────────────────────
function buildHaversineMatrix(locs) {
  const SPEED = { driving: 40, walking: 4, bicycling: 15, transit: 20 };
  const speed = SPEED[MODE] ?? 40;
  return locs.map((a, i) =>
    locs.map((b, j) =>
      i === j ? 0 : haversineMinutes(a.lat, a.lng, b.lat, b.lng, speed)
    )
  );
}

// ── Google Distance Matrix ────────────────────────────────────
async function buildGoogleMatrix(locs) {
  if (!GOOGLE_API_KEY) return null;
  const coords = locs.map((l) => `${l.lat},${l.lng}`).join("|");
  const t0 = Date.now();
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(coords)}&destinations=${encodeURIComponent(coords)}&mode=${MODE}&key=${GOOGLE_API_KEY}`
  );
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
  const data = await res.json();
  if (data.status !== "OK") {
    console.log(`  [Google] 錯誤：${data.status}`);
    return null;
  }
  const matrix = data.rows.map((row, i) =>
    row.elements.map((el, j) =>
      i === j ? 0 : el.status === "OK" ? Math.max(1, Math.round(el.duration.value / 60)) : -1
    )
  );
  return { matrix, elapsed };
}

// ── ORS Distance Matrix ───────────────────────────────────────
async function buildOrsMatrix(locs) {
  if (!ORS_API_KEY) return null;
  const ORS_PROFILE = { driving: "driving-car", walking: "foot-walking", bicycling: "cycling-regular", transit: "driving-car" };
  const profile = ORS_PROFILE[MODE] ?? "driving-car";
  const coordinates = locs.map((l) => [l.lng, l.lat]);
  const t0 = Date.now();
  const res = await fetch(
    `https://api.openrouteservice.org/v2/matrix/${profile}`,
    {
      method: "POST",
      headers: { Authorization: ORS_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ locations: coordinates, metrics: ["duration"] }),
    }
  );
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
  if (!res.ok) {
    const txt = await res.text();
    console.log(`  [ORS] 錯誤 ${res.status}：${txt.slice(0, 200)}`);
    return null;
  }
  const data = await res.json();
  const matrix = data.durations.map((row, i) =>
    row.map((v, j) => (i === j ? 0 : v == null ? -1 : Math.max(1, Math.round(v / 60))))
  );
  return { matrix, elapsed };
}

// ── 印矩陣 ────────────────────────────────────────────────────
function printMatrix(matrix, locs, title) {
  const names = locs.map((l) => l.name.slice(0, 5).padStart(7));
  console.log(`\n${divider()}`);
  console.log(`  ${title}`);
  console.log(divider());
  console.log("        " + names.join(""));
  matrix.forEach((row, i) => {
    const cells = row.map((v) => String(v >= 0 ? v : "ERR").padStart(7)).join("");
    console.log(`${locs[i].name.slice(0, 5).padStart(7)} ${cells}`);
  });
}

// ── 差異分析 ──────────────────────────────────────────────────
function diffAnalysis(m1, m2, locs, label1, label2) {
  const diffs = [];
  for (let i = 0; i < locs.length; i++) {
    for (let j = 0; j < locs.length; j++) {
      if (i === j) continue;
      const v1 = m1[i][j], v2 = m2[i][j];
      if (v1 > 0 && v2 > 0) {
        const diff = Math.abs(v1 - v2);
        diffs.push({ diff, pct: (diff / v1) * 100, src: locs[i].name, dst: locs[j].name, v1, v2 });
      }
    }
  }
  if (!diffs.length) return;
  const avgDiff = diffs.reduce((s, d) => s + d.diff, 0) / diffs.length;
  const avgPct = diffs.reduce((s, d) => s + d.pct, 0) / diffs.length;
  const worst = diffs.sort((a, b) => b.diff - a.diff)[0];

  console.log(`\n${divider()}`);
  console.log(`  ${label1} vs ${label2} 差異（${MODE} 模式）`);
  console.log(divider());
  console.log(`  比較組數：${diffs.length}`);
  console.log(`  平均差異：${avgDiff.toFixed(1)} 分鐘（${avgPct.toFixed(1)}%）`);
  console.log(`  最大差異：${worst.diff} 分鐘 — ${worst.src} → ${worst.dst}`);
  console.log(`            ${label1}=${worst.v1}min  ${label2}=${worst.v2}min`);
  console.log(`\n  前5大差異：`);
  diffs.slice(0, 5).forEach(({ diff, pct, src, dst, v1, v2 }) => {
    console.log(`    ${src.slice(0, 5)} → ${dst.slice(0, 5)}: ${label1}=${v1}min ${label2}=${v2}min 差=${diff}min (${pct.toFixed(0)}%)`);
  });
}

// ── 主程式 ────────────────────────────────────────────────────
async function main() {
  console.log(`\nDistance Matrix 比較測試`);
  console.log(`地點數：${LOCATIONS.length}，模式：${MODE}`);
  console.log(`Google API Key：${GOOGLE_API_KEY ? "✓" : "✗ 未設定"}`);
  console.log(`ORS API Key：  ${ORS_API_KEY ? "✓" : "✗ 未設定"}`);

  const hav = buildHaversineMatrix(LOCATIONS);
  printMatrix(hav, LOCATIONS, "Haversine 基準線（分鐘）");

  const googleRes = await buildGoogleMatrix(LOCATIONS);
  if (googleRes) {
    printMatrix(googleRes.matrix, LOCATIONS, `Google Distance Matrix (${googleRes.elapsed}s)`);
    diffAnalysis(hav, googleRes.matrix, LOCATIONS, "Haversine", "Google");
  } else {
    console.log("\n[Google] 跳過");
  }

  const orsRes = await buildOrsMatrix(LOCATIONS);
  if (orsRes) {
    printMatrix(orsRes.matrix, LOCATIONS, `ORS Distance Matrix (${orsRes.elapsed}s)`);
    diffAnalysis(hav, orsRes.matrix, LOCATIONS, "Haversine", "ORS");
    if (googleRes) diffAnalysis(googleRes.matrix, orsRes.matrix, LOCATIONS, "Google", "ORS");
  } else {
    console.log("\n[ORS] 跳過");
  }
  console.log();
}

main().catch(console.error);
