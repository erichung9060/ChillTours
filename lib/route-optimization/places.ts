import type { ActivityInput, EnrichedActivity } from "./types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

// ── 批次豐富化（呼叫 resolve-places Edge Function）────────────

export async function enrichActivities(
  activities: ActivityInput[]
): Promise<EnrichedActivity[]> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.warn("[places] Missing SUPABASE_URL or SERVICE_ROLE_KEY — skipping enrichment");
    return activities.map((a) => ({ id: a.id, lat: a.lat, lng: a.lng }));
  }

  const BATCH = 5;
  const results: EnrichedActivity[] = [];

  for (let i = 0; i < activities.length; i += BATCH) {
    const batch = activities.slice(i, i + BATCH);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/resolve-places`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-service-role-key": SERVICE_ROLE_KEY,
        },
        body: JSON.stringify({
          places: batch.map((a) => ({ id: a.id, name: a.title, lat: a.lat, lng: a.lng })),
        }),
      });

      if (!res.ok) {
        console.warn(`[places] resolve-places HTTP ${res.status} — using original coords for batch`);
        results.push(...batch.map((a) => ({ id: a.id, lat: a.lat, lng: a.lng })));
        continue;
      }

      const { resolved } = await res.json() as { resolved: Array<{
        id: string;
        place_id?: string;
        lat?: number;
        lng?: number;
        rating?: number;
        opening_hours?: Record<string, unknown>;
        error?: string;
      }> };

      for (let j = 0; j < batch.length; j++) {
        const r = resolved[j];
        const orig = batch[j];
        results.push({
          id: orig.id,
          place_id: r.place_id,
          lat: r.lat ?? orig.lat,
          lng: r.lng ?? orig.lng,
          rating: r.rating,
          opening_hours: r.opening_hours,
        });
      }
    } catch (err) {
      console.warn("[places] resolve-places exception — using original coords for batch:", err);
      results.push(...batch.map((a) => ({ id: a.id, lat: a.lat, lng: a.lng })));
    }
  }

  return results;
}
