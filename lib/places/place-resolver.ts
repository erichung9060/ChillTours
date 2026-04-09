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
 * Resolve complete place details via the backend API proxy (/api/resolve-places).
 *
 * Always calls the API to ensure full Google Places data is returned.
 * Falls back to a location with partial details omitted if the API fails.
 *
 * @param location - Partial location (typically just a name)
 * @returns Location with full place details (unknown fields are omitted)
 */
export async function resolvePlaceDetails(location: PartialLocation): Promise<Location> {
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
      console.warn("API place resolution failed with status:", response.status);
      return fallback(location);
    }

    const data = await response.json();
    const resolved = data.resolved?.find((r: any) => r.id === id);

    if (resolved && !resolved.error) {
      return {
        name: resolved.name || location.name,
        ...(resolved.lat !== undefined && { lat: resolved.lat }),
        ...(resolved.lng !== undefined && { lng: resolved.lng }),
        ...(resolved.place_id !== undefined && { place_id: resolved.place_id }),
        ...(resolved.rating !== undefined && { rating: resolved.rating }),
        ...(resolved.user_ratings_total !== undefined && {
          user_ratings_total: resolved.user_ratings_total,
        }),
        ...(resolved.opening_hours !== undefined && {
          opening_hours: resolved.opening_hours,
        }),
        ...(resolved.website !== undefined && { website: resolved.website }),
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
    ...(location.lat !== undefined && { lat: location.lat }),
    ...(location.lng !== undefined && { lng: location.lng }),
  };
}
