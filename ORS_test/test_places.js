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

// ── ORS Snap（最近道路點）─────────────────────────────────────
async function orsSnap(lat, lng) {
  if (!ORS_API_KEY) return null;
  try {
    const res = await fetch("https://api.openrouteservice.org/v2/snap", {
      method: "POST",
      headers: { Authorization: ORS_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        locations: [[lng, lat]],
        radius: 300,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const loc = data.locations?.[0];
    if (!loc) return null;
    return { lat: loc.location[1], lng: loc.location[0], name: loc.name };
  } catch { return null; }
}

// ── 印出單筆比較 ──────────────────────────────────────────────
async function printPlaceResult(place, google, ors) {
  console.log(`\n  ${"─".repeat(58)}`);
  console.log(`  搜尋：${place.name}`);

  if (!google) {
    console.log(`  [Google Places]  ✗ 無結果`);
  } else {
    console.log(`\n  [Google Places]  (${google.elapsed}s)`);
    console.log(`    名稱：${google.name}`);
    console.log(`    座標：${google.lat.toFixed(5)}, ${google.lng.toFixed(5)}`);
    if (google.rating != null) console.log(`    評分：${google.rating} (${google.ratingsTotal} 則)`);
    if (google.opening) console.log(`    開放：${google.opening.open} – ${google.opening.close}`);
  }

  if (!ors) {
    console.log(`\n  [ORS Geocoding]  ✗ 無結果`);
  } else {
    const diffFromGoogle = google ? haversineMeters(google.lat, google.lng, ors.lat, ors.lng) : null;
    console.log(`\n  [ORS Geocoding]  (${ors.elapsed}s)`);
    console.log(`    名稱：${ors.name}`);
    console.log(`    座標：${ors.lat.toFixed(5)}, ${ors.lng.toFixed(5)}`);
    console.log(`    信心度：${ors.confidence}  類型：${ors.layer}`);
    if (diffFromGoogle != null) console.log(`    距 Google：${Math.round(diffFromGoogle)}m`);

    // Snap ORS 座標到最近道路
    const snap = await orsSnap(ors.lat, ors.lng);
    if (snap) {
      const snapDiff = haversineMeters(ors.lat, ors.lng, snap.lat, snap.lng);
      const snapVsGoogle = google ? haversineMeters(google.lat, google.lng, snap.lat, snap.lng) : null;
      console.log(`\n  [ORS Snap]`);
      console.log(`    座標：${snap.lat.toFixed(5)}, ${snap.lng.toFixed(5)}  路名：${snap.name ?? "─"}`);
      console.log(`    ORS → Snap：${Math.round(snapDiff)}m`);
      if (snapVsGoogle != null) console.log(`    Snap 距 Google：${Math.round(snapVsGoogle)}m`);
    }

    return diffFromGoogle;
  }
  return null;
}

// ── 總結 ──────────────────────────────────────────────────────
function printSummary(diffs) {
  const valid = diffs.filter((v) => v != null);
  const avg = valid.length ? Math.round(valid.reduce((s, v) => s + v, 0) / valid.length) : null;
  const max = valid.length ? Math.round(Math.max(...valid)) : null;

  console.log(`\n${divider()}`);
  console.log(`  總結（${diffs.length} 筆，ORS 距 Google 的距離）`);
  console.log(divider());
  console.log(`  平均差距：${avg ?? "N/A"}m`);
  console.log(`  最大差距：${max ?? "N/A"}m`);
  console.log(`  找不到：${diffs.filter((v) => v == null).length} 筆`);
  console.log();
  console.log(`  功能對比：`);
  console.log(`  ${"".padEnd(16)} ${"Google".padStart(8)} ${"ORS".padStart(8)}`);
  console.log(`  ${"座標".padEnd(16)} ${"✓".padStart(8)} ${"✓".padStart(8)}`);
  console.log(`  ${"opening_hours".padEnd(16)} ${"✓".padStart(8)} ${"✗".padStart(8)}`);
  console.log(`  ${"評分".padEnd(16)} ${"✓".padStart(8)} ${"✗".padStart(8)}`);
}

// ── 主程式 ────────────────────────────────────────────────────
async function main() {
  console.log(`\n地點資料比較測試（台灣景點）`);
  console.log(`Google API Key：${GOOGLE_API_KEY ? "✓" : "✗ 未設定"}`);
  console.log(`ORS API Key：  ${ORS_API_KEY ? "✓" : "✗ 未設定"}`);
  console.log(`\n${divider()}`);
  console.log(`  地點搜尋結果`);

  const diffs = [];
  for (const place of TEST_PLACES) {
    const [google, ors] = await Promise.all([
      googleSearch(place.name),
      orsGeocode(place.name),
    ]);
    const diff = await printPlaceResult(place, google, ors);
    diffs.push(diff);
    await new Promise((r) => setTimeout(r, 300));
  }

  printSummary(diffs);
  console.log();
}

main().catch(console.error);
