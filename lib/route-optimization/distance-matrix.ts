import type { ActivityInput, TransportMode } from "./types";

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Haversine fallback 速度（與 Python 一致）
const MODE_SPEED_KMH: Record<TransportMode, number> = {
  walking: 4.0,
  bicycling: 15.0,
  driving: 40.0,
  transit: 20.0,
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildHaversineMatrix(activities: ActivityInput[], mode: TransportMode): number[][] {
  const speed = MODE_SPEED_KMH[mode];
  return activities.map((a, i) =>
    activities.map((b, j) => {
      if (i === j) return 0;
      const km = haversineKm(a.lat, a.lng, b.lat, b.lng);
      return Math.max(1, Math.round((km / speed) * 60));
    })
  );
}

async function buildGoogleMatrix(
  activities: ActivityInput[],
  mode: TransportMode
): Promise<number[][] | null> {
  if (!GOOGLE_API_KEY) return null;

  // Google Distance Matrix 支援所有 mode，transit 直接傳
  const coords = activities.map((a) => `${a.lat},${a.lng}`).join("|");
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?` +
        `origins=${encodeURIComponent(coords)}&destinations=${encodeURIComponent(coords)}` +
        `&mode=${mode}&key=${GOOGLE_API_KEY}`,
      { next: { revalidate: 0 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== "OK") return null;

    return data.rows.map((row: { elements: { status: string; duration: { value: number } }[] }, i: number) =>
      row.elements.map((el: { status: string; duration: { value: number } }, j: number) => {
        if (i === j) return 0;
        if (el.status === "OK") return Math.max(1, Math.round(el.duration.value / 60));
        // 單格失敗：用 Haversine 補
        const a = activities[i], b = activities[j];
        const km = haversineKm(a.lat, a.lng, b.lat, b.lng);
        return Math.max(1, Math.round((km / MODE_SPEED_KMH[mode]) * 60));
      })
    );
  } catch {
    return null;
  }
}

/**
 * 取得分鐘整數距離矩陣。
 * 優先 Google Distance Matrix，失敗時自動 Haversine fallback。
 */
export async function buildDistanceMatrix(
  activities: ActivityInput[],
  mode: TransportMode
): Promise<number[][]> {
  const n = activities.length;

  if (!GOOGLE_API_KEY) {
    console.info(`[distance-matrix] GOOGLE_MAPS_API_KEY not set — using Haversine (${mode})`);
  }

  const google = await buildGoogleMatrix(activities, mode);
  if (google) {
    const sample = n >= 2 ? `sample [0→1]=${google[0][1]}min` : "n/a";
    console.info(`[distance-matrix] Google Distance Matrix API (${mode}) — ${n}×${n} matrix, ${sample}`);
    return google;
  }

  console.warn(`[distance-matrix] Google Maps failed — falling back to Haversine (${mode})`);
  // transit 模式下 Google 失敗，改用 driving 速度的 Haversine
  const fallbackMode: TransportMode = mode === "transit" ? "driving" : mode;
  const haversine = buildHaversineMatrix(activities, fallbackMode);
  const sample = n >= 2 ? `sample [0→1]=${haversine[0][1]}min` : "n/a";
  console.info(`[distance-matrix] Haversine fallback (${fallbackMode}, ${MODE_SPEED_KMH[fallbackMode]} km/h) — ${n}×${n} matrix, ${sample}`);
  return haversine;
}
