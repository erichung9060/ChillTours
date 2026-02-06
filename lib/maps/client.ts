/**
 * Map Utilities
 *
 * Internal utilities shared by map providers.
 * These are not meant to be used directly by application code.
 * Use MapProvider interface instead.
 *
 * Requirements: 6.1, 6.2, 6.4, 6.5, 12.1, 12.2
 */

import type { Location } from "@/types/itinerary";

/**
 * Calculate the center point and zoom level for a set of locations
 * This is a provider-agnostic utility used by all map providers
 */
export function calculateMapBounds(locations: Location[]): {
  center: { lat: number; lng: number };
  zoom: number;
} {
  if (locations.length === 0) {
    return {
      center: { lat: 0, lng: 0 },
      zoom: 2,
    };
  }

  if (locations.length === 1) {
    return {
      center: { lat: locations[0].lat, lng: locations[0].lng },
      zoom: 14,
    };
  }

  // Calculate bounds
  let minLat = locations[0].lat;
  let maxLat = locations[0].lat;
  let minLng = locations[0].lng;
  let maxLng = locations[0].lng;

  locations.forEach((loc) => {
    minLat = Math.min(minLat, loc.lat);
    maxLat = Math.max(maxLat, loc.lat);
    minLng = Math.min(minLng, loc.lng);
    maxLng = Math.max(maxLng, loc.lng);
  });

  const center = {
    lat: (minLat + maxLat) / 2,
    lng: (minLng + maxLng) / 2,
  };

  // Calculate zoom level based on bounds
  const latDiff = maxLat - minLat;
  const lngDiff = maxLng - minLng;
  const maxDiff = Math.max(latDiff, lngDiff);

  let zoom = 14;
  if (maxDiff > 10) zoom = 4;
  else if (maxDiff > 5) zoom = 6;
  else if (maxDiff > 2) zoom = 8;
  else if (maxDiff > 1) zoom = 10;
  else if (maxDiff > 0.5) zoom = 11;
  else if (maxDiff > 0.1) zoom = 12;
  else if (maxDiff > 0.05) zoom = 13;

  return { center, zoom };
}
