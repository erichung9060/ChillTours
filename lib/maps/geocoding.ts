/**
 * Geocoding Utilities
 *
 * Handles automatic geocoding for locations that don't have coordinates
 * or place_id from LLM responses.
 */

import type { Location } from "@/types/itinerary";
import { getAccessToken } from "@/lib/supabase/client";

/**
 * Partial location that may be missing coordinates
 */
export interface PartialLocation {
  name: string;
  lat?: number;
  lng?: number;
  place_id?: string;
}

/**
 * Check if location has valid coordinates
 *
 * @param location - Location to validate
 * @returns true if coordinates are valid, false otherwise
 */
export function hasValidCoordinates(location: PartialLocation): boolean {
  return (
    typeof location.lat === "number" &&
    typeof location.lng === "number" &&
    !isNaN(location.lat) &&
    !isNaN(location.lng) &&
    location.lat >= -90 &&
    location.lat <= 90 &&
    location.lng >= -180 &&
    location.lng <= 180
  );
}

/**
 * Resolve location using the backend API proxy (/api/resolve-places)
 *
 * @param location - Name and optional coordinates of the location
 * @returns Complete location or null if failed
 */
async function resolvePlaceWithAPI(
  location: PartialLocation
): Promise<Location | null> {
  try {
    const token = await getAccessToken();
    const id = crypto.randomUUID();

    const response = await fetch("/api/resolve-places", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({
        places: [
          {
            id,
            name: location.name,
            ...(location.lat !== undefined && { lat: location.lat }),
            ...(location.lng !== undefined && { lng: location.lng }),
          },
        ],
      }),
    });

    if (!response.ok) {
      console.warn("API geocoding failed with status:", response.status);
      return null;
    }

    const data = await response.json();
    const resolved = data.resolved?.find((r: any) => r.id === id);

    if (resolved && !resolved.error) {
      return {
        name: resolved.name || location.name,
        lat: resolved.lat,
        lng: resolved.lng,
        place_id: resolved.place_id,
      };
    }

    console.warn("No resolved data returned for:", location.name);
    return null;
  } catch (error) {
    console.error("Error calling /api/resolve-places:", error);
    return null;
  }
}

/**
 * Geocode location using backend API
 * Returns null if geocoding fails
 *
 * @param location - Partial location to geocode
 * @returns Complete location with coordinates, or null if geocoding fails
 */
export async function geocodeLocation(
  location: PartialLocation
): Promise<Location | null> {
  return resolvePlaceWithAPI(location);
}

/**
 * Ensure location has valid coordinates with fallback
 * This is the high-level function that combines validation + geocoding + fallback
 *
 * Strategy:
 * 1. If valid coordinates exist → return as-is
 * 2. If coordinates missing → geocode via API
 * 3. If geocoding fails → return with fallback (0, 0)
 *
 * @param location - Partial location that may be missing data
 * @returns Complete location with guaranteed coordinates (may use fallback)
 */
export async function ensureLocationData(
  location: PartialLocation
): Promise<Location> {
  // 1. Check if already valid
  if (hasValidCoordinates(location)) {
    return {
      name: location.name,
      lat: location.lat!,
      lng: location.lng!,
      place_id: location.place_id,
    };
  }

  // 2. Attempt geocoding
  console.log(
    `Location "${location.name}" missing coordinates, attempting geocoding...`
  );

  const geocoded = await geocodeLocation(location);
  if (geocoded) {
    return geocoded;
  }

  // 3. Fallback
  console.warn(
    `Failed to geocode "${location.name}", using fallback coordinates`
  );
  return {
    name: location.name,
    lat: 0,
    lng: 0,
  };
}
