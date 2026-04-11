import type { Location } from "@/types/itinerary";

/**
 * Creates a Google Maps directions link that works on mobile app handoff and desktop web.
 *
 * @param location The location object
 * @returns A Google Maps directions URL
 */
export function createDirectionsLink(location: Location): string {
  const { name, place_id } = location;
  const destination = encodeURIComponent(name);

  if (place_id) {
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}&destination_place_id=${place_id}`;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

/**
 * Creates a Google Maps place-search link that resolves to the landmark page when possible.
 *
 * @param location The location object
 * @returns A Google Maps place-search URL
 */
export function createPlaceSearchLink(location: Location): string {
  const { name, place_id } = location;
  const query = encodeURIComponent(name);

  if (place_id) {
    return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${place_id}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
