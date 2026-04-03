/**
 * Geographic Utilities
 *
 * General-purpose geographic utility functions.
 */

/**
 * Check if location has valid coordinates
 * Handles undefined, NaN, and out-of-range values
 *
 * @param location - Location to validate
 * @returns true if coordinates are valid numbers within range
 */
export function hasValidCoordinates<T extends { lat?: number; lng?: number }>(
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
