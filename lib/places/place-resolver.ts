/**
 * Place Resolver
 *
 * Resolves complete place details (coordinates, rating, opening hours, website)
 * via the backend API proxy (/api/resolve-places) which calls Google Places API.
 */

import type { Location } from "@/types/itinerary";
import { getAccessToken } from "@/lib/supabase/client";

/**
 * Partial location that may be missing coordinates or place details
 */
export interface PartialLocation {
  name: string;
  lat?: number;
  lng?: number;
}

/**
 * Check if location has valid coordinates
 * Handles null, undefined, NaN, and out-of-range values
 *
 * @param location - Location to validate
 * @returns true if coordinates are valid numbers within range
 */
export function hasValidCoordinates<T extends { lat?: number | null; lng?: number | null }>(
  location: T
): location is T & { lat: number; lng: number } {
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
 * Resolve complete place details via the backend API proxy (/api/resolve-places).
 *
 * Always calls the API to ensure full Google Places data is returned.
 * Falls back to a location with null coordinates if the API fails.
 *
 * @param location - Partial location (typically just a name)
 * @returns Location with full place details (coordinates may be null if unknown)
 */
export async function resolvePlaceDetails(
  location: PartialLocation
): Promise<Location> {
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
            ...(location.lat != null && { lat: location.lat }),
            ...(location.lng != null && { lng: location.lng }),
          },
        ],
      }),
    });

    if (!response.ok) {
      console.warn("API place resolution failed with status:", response.status);
      return fallback(location);
    }

    const data = await response.json();
    const resolved = data.resolved?.find((r: any) => r.id === id);

    if (resolved && !resolved.error) {
      return {
        name: resolved.name || location.name,
        lat: resolved.lat ?? null,
        lng: resolved.lng ?? null,
        place_id: resolved.place_id,
        rating: resolved.rating ?? null,
        user_ratings_total: resolved.user_ratings_total ?? null,
        opening_hours: resolved.opening_hours ?? null,
        website: resolved.website ?? null,
      };
    }

    console.warn("No resolved data returned for:", location.name);
    return fallback(location);
  } catch (error) {
    console.error("Error calling /api/resolve-places:", error);
    return fallback(location);
  }
}

function fallback(location: PartialLocation): Location {
  console.warn(`Failed to resolve "${location.name}", place details will be unavailable`);
  return {
    name: location.name,
    lat: location.lat ?? null,
    lng: location.lng ?? null,
    rating: null,
    user_ratings_total: null,
    opening_hours: null,
    website: null,
  };
}
