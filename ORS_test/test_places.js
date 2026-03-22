/**
 * Test 3: 地點資料比較
 * Google Places API vs ORS Geocoding
 * 比較：座標精度、開放時間、評分支援
 *
 * 執行：node ORS_test/test_places.js
 */

import { ORS_API_KEY, GOOGLE_API_KEY, haversineMeters, divider } from "./utils.js";

const TEST_PLACES = [
  { name: "國立故宮博物院",     expectedLat: 25.1023, expectedLng: 121.5484 },
  { name: "台北 101",           expectedLat: 25.0338, expectedLng: 121.5645 },
  { name: "龍山寺",             expectedLat: 25.0373, expectedLng: 121.4997 },
  { name: "士林夜市",           expectedLat: 25.0877, expectedLng: 121.5241 },
  { name: "國立台灣博物館",     expectedLat: 25.0448, expectedLng: 121.5128 },
  { name: "九份老街",           expectedLat: 25.1093, expectedLng: 121.8448 },
  { name: "Starbucks 台北信義", expectedLat: 25.0360, expectedLng: 121.5660 },
];

// ── Google Places Text Search + Details ───────────────────────
async function googleSearch(name) {
  if (!GOOGLE_API_KEY) return null;
  const t0 = Date.now();
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(name)}&language=zh-TW&key=${GOOGLE_API_KEY}`
  );
  const data = await res.json();
  if (data.status !== "OK" || !data.results.length) return null;
  const r = data.results[0];
  const { lat, lng } = r.geometry.location;

  // 取 place details（開放時間）
  let opening = null;
  if (r.place_id) {
    const dr = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${r.place_id}&fields=opening_hours&key=${GOOGLE_API_KEY}`
    );
    const dd = await dr.json();
    const periods = dd.result?.opening_hours?.periods ?? [];
    // 取週一（day=1）
    const p = periods.find((x) => x.open?.day === 1);
    if (p) {
      const fmt = (t) => `${t.slice(0, 2)}:${t.slice(2)}`;
      opening = { open: fmt(p.open.time), close: p.close ? fmt(p.close.time) : "24:00" };
    }
  }

  return {
    name: r.name,
    lat, lng,
    placeId: r.place_id,
    rating: r.rating,
    ratingsTotal: r.user_ratings_total,
    opening,
    elapsed: ((Date.now() - t0) / 1000).toFixed(2),
  };
}

// ── ORS Geocoding ─────────────────────────────────────────────
async function orsGeocode(name) {
  if (!ORS_API_KEY) return null;
  const t0 = Date.now();
  const params = new URLSearchParams({
    text: name,
    size: "1",
    lang: "zh-TW",
    "boundary.country": "TW",
    "focus.point.lat": "25.0",
    "focus.point.lon": "121.5",
  });
  const res = await fetch(
    `https://api.openrouteservice.org/geocode/search?${params}`,
    { headers: { Authorization: ORS_API_KEY } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const features = data.features ?? [];
  if (!features.length) return null;
  const f = features[0];
  const [lng, lat] = f.geometry.coordinates;
  const p = f.properties;
  return {
    name: p.label ?? p.name,
    lat, lng,
    placeId: p.id,
    rating: null,
    ratingsTotal: null,
    opening: null,
    confidence: p.confidence,
    layer: p.layer,
    elapsed: ((Date.now() - t0) / 1000).toFixed(2),
  };
}

// ── 印出單筆比較 ──────────────────────────────────────────────
function printPlaceResult(place, google, ors) {
  console.log(`\n  ${"─".repeat(58)}`);
  console.log(`  搜尋：${place.name}`);
  console.log(`  期望：${place.expectedLat}, ${place.expectedLng}`);

  const fmt = (r, label) => {
    if (!r) { console.log(`\n  [${label}]  ✗ 無結果`); return null; }
    const err = haversineMeters(place.expectedLat, place.expectedLng, r.lat, r.lng);
    console.log(`\n  [${label}]  (${r.elapsed}s)`);
    console.log(`    名稱：${r.name}`);
    console.log(`    座標：${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}  誤差 ${Math.round(err)}m`);
    if (r.rating != null) console.log(`    評分：${r.rating} (${r.ratingsTotal} 則)`);
    else console.log(`    評分：不支援`);
    if (r.opening) console.log(`    開放：${r.opening.open} – ${r.opening.close}`);
    else console.log(`    開放時間：不支援`);
    if (r.confidence != null) console.log(`    信心度：${r.confidence}  類型：${r.layer}`);
    return err;
  };

  const gErr = fmt(google, "Google Places");
  const oErr = fmt(ors, "ORS Geocoding");

  if (gErr != null && oErr != null) {
    const winner = gErr < oErr ? "Google" : oErr < gErr ? "ORS" : "平手";
    console.log(`\n  → 座標較準：${winner}（Google ${Math.round(gErr)}m vs ORS ${Math.round(oErr)}m）`);
  }
}

// ── 總結 ──────────────────────────────────────────────────────
function printSummary(results) {
  const gErrs = results.map((r) => r.gErr).filter((v) => v != null);
  const oErrs = results.map((r) => r.oErr).filter((v) => v != null);
  const avg = (arr) => arr.length ? (arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(0) : "N/A";

  console.log(`\n${divider()}`);
  console.log(`  地點資料總結（${results.length} 筆）`);
  console.log(divider());
  console.log(`  平均座標誤差：Google ${avg(gErrs)}m  |  ORS ${avg(oErrs)}m`);
  console.log();
  console.log(`  ${"功能".padEnd(16)} ${"Google".padStart(8)} ${"ORS".padStart(8)}`);
  console.log(`  ${"座標搜尋".padEnd(16)} ${"✓".padStart(8)} ${"✓".padStart(8)}`);
  console.log(`  ${"評分".padEnd(16)} ${"✓".padStart(8)} ${"✗".padStart(8)}`);
  console.log(`  ${"開放時間".padEnd(16)} ${"✓".padStart(8)} ${"✗".padStart(8)}`);
  console.log(`  ${"中文名稱".padEnd(16)} ${"✓".padStart(8)} ${"△".padStart(8)}`);
  console.log(`  ${"台灣資料完整度".padEnd(16)} ${"高".padStart(8)} ${"中".padStart(8)}`);
  console.log();
  console.log(`  結論：ORS Geocoding 可提供座標，但評分/開放時間仍需 Google Places。`);
}

// ── 主程式 ────────────────────────────────────────────────────
async function main() {
  console.log(`\n地點資料比較測試（台灣景點）`);
  console.log(`Google API Key：${GOOGLE_API_KEY ? "✓" : "✗ 未設定"}`);
  console.log(`ORS API Key：  ${ORS_API_KEY ? "✓" : "✗ 未設定"}`);
  console.log(`\n${divider()}`);
  console.log(`  地點搜尋結果`);

  const summary = [];
  for (const place of TEST_PLACES) {
    const [google, ors] = await Promise.all([
      googleSearch(place.name),
      orsGeocode(place.name),
    ]);
    printPlaceResult(place, google, ors);
    summary.push({
      gErr: google ? haversineMeters(place.expectedLat, place.expectedLng, google.lat, google.lng) : null,
      oErr: ors ? haversineMeters(place.expectedLat, place.expectedLng, ors.lat, ors.lng) : null,
    });
    await new Promise((r) => setTimeout(r, 200)); // rate limit
  }

  printSummary(summary);
  console.log();
}

main().catch(console.error);
