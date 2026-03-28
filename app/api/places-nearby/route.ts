import { NextRequest, NextResponse } from "next/server";

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const PLACES_BASE = "https://places.googleapis.com/v1";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.location",
  "places.rating",
  "places.regularOpeningHours",
].join(",");

export interface RestaurantCandidate {
  place_id: string;
  name: string;
  lat: number;
  lng: number;
  rating?: number;
  opening_hours?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  const { lat, lng, radius = 500 } = await request.json() as {
    lat: number;
    lng: number;
    radius?: number;
  };

  console.info(`[places-nearby] Searching at (${lat}, ${lng}) radius=${radius}m`);

  if (!GOOGLE_API_KEY) {
    console.warn("[places-nearby] Missing GOOGLE_MAPS_API_KEY");
    return NextResponse.json({ restaurants: [] });
  }

  try {
    const body: Record<string, unknown> = {
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius,
        },
      },
      includedTypes: ["restaurant"],
      maxResultCount: 10,
      rankPreference: "POPULARITY",
      languageCode: "zh-TW",
    };

    const res = await fetch(`${PLACES_BASE}/places:searchNearby`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_API_KEY,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.warn(`[places-nearby] Google API error ${res.status}`);
      return NextResponse.json({ restaurants: [] });
    }

    const data = await res.json() as { places?: Array<Record<string, unknown>> };
    const places = data.places ?? [];

    const restaurants: RestaurantCandidate[] = places
      .sort((a, b) => ((b.rating as number) ?? 0) - ((a.rating as number) ?? 0))
      .slice(0, 3)
      .map((p) => {
      const loc = p.location as Record<string, number> | undefined;
      const name = (p.displayName as Record<string, string> | undefined)?.text ?? "餐廳";
      return {
        place_id: p.id as string,
        name,
        lat: loc?.latitude ?? lat,
        lng: loc?.longitude ?? lng,
        rating: p.rating as number | undefined,
        opening_hours: p.regularOpeningHours as Record<string, unknown> | undefined,
      };
    });

    console.info(
      `[places-nearby] Found ${restaurants.length} restaurants: ` +
      restaurants.map((r) => `${r.name}(${r.rating ?? "n/a"}★)`).join(", ")
    );

    return NextResponse.json({ restaurants });
  } catch (err) {
    console.error("[places-nearby] Exception:", err);
    return NextResponse.json({ restaurants: [] });
  }
}
