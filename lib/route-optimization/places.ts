import { createClient } from "@supabase/supabase-js";
import type { ActivityInput, EnrichedActivity } from "./types";

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const PLACES_BASE = "https://places.googleapis.com/v1";

// Server-side Supabase client（service role，繞過 RLS）
function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// ── Google Places API (New) ───────────────────────────────────

async function findPlace(name: string, lat: number, lng: number): Promise<string | null> {
  if (!GOOGLE_API_KEY) return null;
  try {
    const res = await fetch(`${PLACES_BASE}/places:searchText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_API_KEY,
        "X-Goog-FieldMask": "places.id",
      },
      body: JSON.stringify({
        textQuery: name,
        languageCode: "zh-TW",
        locationBias: { circle: { center: { latitude: lat, longitude: lng } } },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.places?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

async function getPlaceDetails(placeId: string): Promise<Record<string, unknown> | null> {
  if (!GOOGLE_API_KEY) return null;
  try {
    const res = await fetch(
      `${PLACES_BASE}/places/${placeId}?languageCode=zh-TW`,
      {
        headers: {
          "X-Goog-Api-Key": GOOGLE_API_KEY,
          "X-Goog-FieldMask": "id,displayName,location,rating,userRatingCount,websiteUri,regularOpeningHours",
        },
      }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ── Supabase cache（google_places 表，與 resolve-places 共用）──

async function checkCache(placeId: string): Promise<Record<string, unknown> | null> {
  try {
    const sb = getServerSupabase();
    if (!sb) return null;
    const { data } = await sb.from("google_places").select("*").eq("place_id", placeId).maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

async function saveCache(row: Record<string, unknown>): Promise<void> {
  try {
    const sb = getServerSupabase();
    if (!sb) return;
    await sb.from("google_places").upsert(row, { onConflict: "place_id" });
  } catch {
    // cache 寫入失敗不中斷流程
  }
}

// ── 時間窗口提取（從 Google Places regularOpeningHours）────────

/**
 * 從 Google Places (New) 的 regularOpeningHours 提取指定星期的開關時間。
 * dayOfWeek：0=Sunday, 1=Monday, ..., 6=Saturday
 */
export function extractTimeWindow(
  openingHours: Record<string, unknown>,
  dayOfWeek: number
): { open: string; close: string } | null {
  const periods = openingHours.periods as Array<{
    open?: { day: number; hour: number; minute: number };
    close?: { day: number; hour: number; minute: number };
  }> | undefined;

  if (!periods?.length) return null;

  const period = periods.find((p) => p.open?.day === dayOfWeek);
  if (!period?.open) return null;

  const fmt = (h: number, m: number) =>
    `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

  return {
    open:  fmt(period.open.hour, period.open.minute),
    close: period.close ? fmt(period.close.hour, period.close.minute) : "23:59",
  };
}

export function getDayOfWeek(dateStr: string): number {
  // "YYYY-MM-DD" → 0=Sunday
  return new Date(dateStr).getDay();
}

// ── 單一 activity 豐富化 ──────────────────────────────────────

async function enrichOne(activity: ActivityInput): Promise<EnrichedActivity> {
  const base: EnrichedActivity = { id: activity.id, lat: activity.lat, lng: activity.lng };

  const placeId = await findPlace(activity.title, activity.lat, activity.lng);
  if (!placeId) {
    console.info(`  [places] ${activity.title} — place not found, keeping original coords`);
    return base;
  }

  // Cache 命中
  const cached = await checkCache(placeId);
  if (cached) {
    console.info(`  [places] ${activity.title} — cache hit (${placeId})`);
    return {
      id: activity.id,
      place_id: placeId,
      lat: (cached.lat as number) ?? activity.lat,
      lng: (cached.lng as number) ?? activity.lng,
      rating: (cached.rating as number) ?? undefined,
      opening_hours: (cached.opening_hours as Record<string, unknown>) ?? undefined,
    };
  }

  // Cache miss → Place Details
  console.info(`  [places] ${activity.title} — cache miss, fetching Place Details (${placeId})`);
  const details = await getPlaceDetails(placeId);
  if (!details) return { ...base, place_id: placeId };

  const location = details.location as Record<string, number> | undefined;
  const displayName = (details.displayName as Record<string, string>)?.text;
  const row: Record<string, unknown> = {
    place_id: placeId,
    name: displayName ?? activity.title,
    lat: location?.latitude ?? activity.lat,
    lng: location?.longitude ?? activity.lng,
    rating: (details.rating as number) ?? undefined,
    user_ratings_total: (details.userRatingCount as number) ?? undefined,
    website: (details.websiteUri as string) ?? undefined,
    opening_hours: (details.regularOpeningHours as Record<string, unknown>) ?? undefined,
  };

  await saveCache(row);

  const hasHours = !!row.opening_hours;
  console.info(`  [places] ${activity.title} — fetched, rating=${row.rating ?? "n/a"}, hasHours=${hasHours}`);

  return {
    id: activity.id,
    place_id: placeId,
    lat: (row.lat as number),
    lng: (row.lng as number),
    rating: row.rating as number | undefined,
    opening_hours: row.opening_hours as Record<string, unknown> | undefined,
  };
}

// ── 批次豐富化（最多 5 個並行）────────────────────────────────

export async function enrichActivities(
  activities: ActivityInput[]
): Promise<EnrichedActivity[]> {
  const BATCH = 5;
  const results: EnrichedActivity[] = [];

  for (let i = 0; i < activities.length; i += BATCH) {
    const batch = activities.slice(i, i + BATCH);
    const enriched = await Promise.all(batch.map(enrichOne));
    results.push(...enriched);
  }

  return results;
}
