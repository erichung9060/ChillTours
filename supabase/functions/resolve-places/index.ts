import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyUser } from "../_shared/auth.ts";

const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ──────────────────────────────────────────────
// Request / Response schemas
// ──────────────────────────────────────────────

const PlaceInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

const ResolveRequestSchema = z.object({
  places: z.array(PlaceInputSchema).min(1).max(50),
});

type PlaceInput = z.infer<typeof PlaceInputSchema>;

interface ResolvedPlace {
  id: string;
  place_id?: string;
  name: string;
  lat?: number;
  lng?: number;
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: Record<string, unknown>;
  website?: string;
  error?: string;
}

// ──────────────────────────────────────────────
// Google Maps API (New) constants
// ──────────────────────────────────────────────

const BASE_URL = "https://places.googleapis.com/v1";

// Field mask for Details - mapped to our database schema
const DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "location",
  "rating",
  "userRatingCount",
  "websiteUri",
  "regularOpeningHours",
].join(",");

// ──────────────────────────────────────────────
// Google Maps helpers
// ──────────────────────────────────────────────

async function findPlace(
  name: string,
  lat?: number,
  lng?: number
): Promise<string | null> {
  if (!apiKey) {
    console.error("Missing GOOGLE_MAPS_API_KEY environment variable");
    return null;
  }

  const url = `${BASE_URL}/places:searchText`;
  const body: Record<string, unknown> = {
    textQuery: name,
    languageCode: "zh-TW",
  };

  if (lat !== undefined && lng !== undefined) {
    body.locationBias = {
      circle: {
        center: { latitude: lat, longitude: lng },
      },
    };
  }

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      console.warn(`[findPlace] HTTP Error ${resp.status}: ${resp.statusText}`);
      throw new Error(
        `Google Maps API Error: ${resp.status} ${resp.statusText}`
      );
    }

    const data = await resp.json();
    const places = data.places ?? [];

    if (places.length === 0) {
      console.log(`[findPlace] no candidates returned for '${name}'`);
      return null;
    }

    return places[0].id ?? null;
  } catch (err) {
    console.error(`[findPlace] Exception for '${name}':`, err);
    throw err;
  }
}

async function getPlaceDetails(
  placeId: string
): Promise<Record<string, unknown> | null> {
  if (!apiKey) {
    console.error("Missing GOOGLE_MAPS_API_KEY environment variable");
    return null;
  }

  const url = `${BASE_URL}/places/${placeId}?languageCode=zh-TW`;

  try {
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": DETAILS_FIELD_MASK,
      },
    });

    if (!resp.ok) {
      console.warn(
        `[getPlaceDetails] HTTP Error ${resp.status}: ${resp.statusText}`
      );
      throw new Error(
        `Google Maps API Error: ${resp.status} ${resp.statusText}`
      );
    }

    return await resp.json();
  } catch (err) {
    console.error(`[getPlaceDetails] Exception for ${placeId}:`, err);
    throw err;
  }
}

async function checkPlaceCache(
  placeId: string
): Promise<Record<string, unknown> | null> {
  try {
    const { data, error } = await supabase
      .from("google_places")
      .select("*")
      .eq("place_id", placeId)
      .maybeSingle();

    if (error) {
      console.warn(
        `[checkPlaceCache] Supabase error for ${placeId}:`,
        error.message
      );
      return null;
    }

    if (!data) return null;
    return data as Record<string, unknown>;
  } catch (err) {
    console.error(`[checkPlaceCache] Exception for ${placeId}:`, err);
    return null;
  }
}

async function savePlaceCache(row: Record<string, unknown>): Promise<void> {
  try {
    const { error } = await supabase
      .from("google_places")
      .upsert(row, { onConflict: "place_id" });

    if (error) {
      console.error(`[savePlaceCache] Supabase error:`, error.message);
    }
  } catch (err) {
    console.error(`[savePlaceCache] Exception:`, err);
  }
}

// ──────────────────────────────────────────────
// Core resolve logic (per place)
// ──────────────────────────────────────────────

async function resolvePlace(input: PlaceInput): Promise<ResolvedPlace> {
  const base: ResolvedPlace = { id: input.id, name: input.name };

  // Step 1: Find Place → place_id only
  const placeId = await findPlace(input.name, input.lat, input.lng);
  if (!placeId) {
    console.warn(`[resolvePlace] no place_id found for '${input.name}'`);
    return { ...base, error: "NOT_FOUND" };
  }

  // Step 2: Check cache
  const cached = await checkPlaceCache(placeId);
  if (cached) {
    return {
      id: input.id,
      place_id: placeId,
      name: (cached.name as string) ?? input.name,
      lat: (cached.lat as number) ?? undefined,
      lng: (cached.lng as number) ?? undefined,
      rating: (cached.rating as number) ?? undefined,
      user_ratings_total: (cached.user_ratings_total as number) ?? undefined,
      opening_hours: (cached.opening_hours as Record<string, unknown>) ?? undefined,
      website: (cached.website as string) ?? undefined,
    };
  }

  // Step 3: Place Details (cache miss)
  const details = await getPlaceDetails(placeId);

  if (!details) {
    console.warn(`[resolvePlace] no details found for '${input.name}'`);
    return { ...base, place_id: placeId, error: "DETAILS_UNAVAILABLE" };
  }

  // Parse all fields from the New Places API structure
  const displayName = (details.displayName as Record<string, string>)?.text;
  const location = details.location as Record<string, number>;

  const data = {
    place_id: placeId,
    name: displayName ?? input.name,
    lat: location?.latitude,
    lng: location?.longitude,
    rating: (details.rating as number) ?? undefined,
    user_ratings_total: (details.userRatingCount as number) ?? undefined,
    website: (details.websiteUri as string) ?? undefined,
    opening_hours: (details.regularOpeningHours as Record<string, unknown>) ?? undefined,
  };

  // Step 4: Save to cache
  await savePlaceCache(data);

  return { id: input.id, ...data };
}

// ──────────────────────────────────────────────
// Edge Function handler
// ──────────────────────────────────────────────

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // API Gateway Secret Check (Request from Next.JS api)
  const expectedSecret = Deno.env.get("API_GATEWAY_SECRET");
  const providedSecret = req.headers.get("x-gateway-secret");
  
  if (providedSecret !== expectedSecret) {
    console.warn("Blocked direct access attempt: Invalid Gateway Secret");
    return new Response(
      JSON.stringify({ error: "Forbidden. Direct access not allowed." }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Auth
    const user = await verifyUser(req);
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized.", code: "UNAUTHORIZED" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse body
    let body;
    try {
      body = await req.json();
    } catch (_err) {
      return new Response(
        JSON.stringify({
          error: "Invalid request body. Expected JSON.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const parsed = ResolveRequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request data",
          details: parsed.error.issues,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { places } = parsed.data;

    // Resolve places sequentially to avoid Google API rate limits
    const resolved: ResolvedPlace[] = [];
    for (const place of places) {
      const result = await resolvePlace(place);
      resolved.push(result);
    }

    return new Response(JSON.stringify({ resolved }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Resolve places error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
