/**
 * 印出 ORS 各 API 的完整原始回傳結果
 * 執行：node ORS_test/debug_raw.js
 */

import { ORS_API_KEY, hhmmToSeconds } from "./utils.js";

const LOCATIONS = [
  { name: "國立故宮博物院", lat: 25.1023, lng: 121.5484 },
  { name: "台北 101",       lat: 25.0338, lng: 121.5645 },
  { name: "龍山寺",         lat: 25.0373, lng: 121.4997 },
  { name: "士林夜市",       lat: 25.0877, lng: 121.5241 },
  { name: "國立台灣博物館", lat: 25.0448, lng: 121.5128 },
  { name: "象山",           lat: 25.0273, lng: 121.5770 },
];

const ACTIVITIES_WITH_WINDOWS = [
  { id: "a1", title: "國立故宮博物院", lat: 25.1023, lng: 121.5484, duration_minutes: 120, time: "09:00", opening_hours: { open: "08:30", close: "18:00" } },
  { id: "a2", title: "台北 101",       lat: 25.0338, lng: 121.5645, duration_minutes: 60,  time: "11:00", opening_hours: { open: "11:00", close: "22:00" } },
  { id: "a3", title: "龍山寺",         lat: 25.0373, lng: 121.4997, duration_minutes: 45,  time: "13:00", opening_hours: { open: "06:00", close: "22:00" } },
  { id: "a4", title: "士林夜市",       lat: 25.0877, lng: 121.5241, duration_minutes: 90,  time: "17:00", opening_hours: { open: "17:00", close: "23:59" } },
  { id: "a5", title: "國立台灣博物館", lat: 25.0448, lng: 121.5128, duration_minutes: 60,  time: "09:00", opening_hours: { open: "09:30", close: "17:00" } },
  { id: "a6", title: "象山",           lat: 25.0273, lng: 121.5770, duration_minutes: 75,  time: "16:00", opening_hours: { open: "00:00", close: "23:59" } },
];

function section(title) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`  ${title}`);
  console.log("=".repeat(70));
}

// ── 1. Distance Matrix ────────────────────────────────────────
async function rawDistanceMatrix() {
  section("1. ORS Distance Matrix — 原始回傳");
  const coordinates = LOCATIONS.map((l) => [l.lng, l.lat]);
  const res = await fetch("https://api.openrouteservice.org/v2/matrix/driving-car", {
    method: "POST",
    headers: { Authorization: ORS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ locations: coordinates, metrics: ["duration", "distance"] }),
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

// ── 2. Optimization (Vroom) — 無時間窗口 ────────────────────
async function rawVroomNoWindow() {
  section("2. ORS Vroom 最佳化 — 無時間窗口 — 原始回傳");
  const jobs = LOCATIONS.map((l, i) => ({
    id: i + 1,
    location: [l.lng, l.lat],
    service: 60 * 60, // 1 小時
  }));
  const vehicles = [{
    id: 1,
    profile: "driving-car",
    start: [LOCATIONS[0].lng, LOCATIONS[0].lat],
    time_window: [hhmmToSeconds("09:00"), hhmmToSeconds("20:00")],
  }];
  const res = await fetch("https://api.openrouteservice.org/optimization", {
    method: "POST",
    headers: { Authorization: ORS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ jobs, vehicles }),
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

// ── 3. Optimization (Vroom) — 有時間窗口 ────────────────────
async function rawVroomWithWindow() {
  section("3. ORS Vroom 最佳化 — 有時間窗口 — 原始回傳");
  const jobs = ACTIVITIES_WITH_WINDOWS.map((act, i) => ({
    id: i + 1,
    location: [act.lng, act.lat],
    service: act.duration_minutes * 60,
    time_windows: [[hhmmToSeconds(act.opening_hours.open), hhmmToSeconds(act.opening_hours.close)]],
  }));
  const vehicles = [{
    id: 1,
    profile: "driving-car",
    start: [ACTIVITIES_WITH_WINDOWS[0].lng, ACTIVITIES_WITH_WINDOWS[0].lat],
    time_window: [hhmmToSeconds("09:00"), hhmmToSeconds("20:00")],
  }];
  const res = await fetch("https://api.openrouteservice.org/optimization", {
    method: "POST",
    headers: { Authorization: ORS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ jobs, vehicles }),
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

// ── 4. Geocoding ─────────────────────────────────────────────
async function rawGeocode() {
  section("4. ORS Geocoding — 「龍山寺」原始回傳");
  const params = new URLSearchParams({
    text: "龍山寺",
    size: "3",
    lang: "zh-TW",
    "boundary.country": "TW",
    "focus.point.lat": "25.0",
    "focus.point.lon": "121.5",
  });
  const res = await fetch(`https://api.openrouteservice.org/geocode/search?${params}`, {
    headers: { Authorization: ORS_API_KEY },
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

async function main() {
  console.log(`ORS API Key：${ORS_API_KEY ? "✓" : "✗ 未設定"}`);
  if (!ORS_API_KEY) { console.log("請設定 ORS_API_KEY"); process.exit(1); }

  await rawDistanceMatrix();
  await rawVroomNoWindow();
  await rawVroomWithWindow();
  await rawGeocode();
  console.log();
}

main().catch(console.error);
