/**
 * Geocoding Utilities
 * 
 * Handles automatic geocoding for locations that don't have coordinates
 * or place_id from LLM responses.
 */

import type { Location } from '@/types/itinerary';

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
 * Geocode result from Google Maps API
 */
interface GeocodeResult {
  lat: number;
  lng: number;
  place_id: string;
  formatted_address: string;
}

/**
 * Geocode a location using Google Maps Geocoding API
 * 
 * @param locationName - Name of the location to geocode
 * @returns Geocoded location with coordinates and place_id, or null if failed
 */
export async function geocodeLocation(locationName: string): Promise<GeocodeResult | null> {
  if (!window.google || !window.google.maps) {
    console.warn('Google Maps API not loaded, cannot geocode:', locationName);
    return null;
  }

  const geocoder = new window.google.maps.Geocoder();

  try {
    const result = await geocoder.geocode({ address: locationName });
    
    if (result.results && result.results.length > 0) {
      const place = result.results[0];
      const location = place.geometry.location;
      
      return {
        lat: location.lat(),
        lng: location.lng(),
        place_id: place.place_id,
        formatted_address: place.formatted_address || locationName,
      };
    }
    
    console.warn('No geocoding results found for:', locationName);
    return null;
  } catch (error) {
    console.error('Geocoding error for', locationName, ':', error);
    return null;
  }
}

/**
 * Ensure location has valid coordinates
 * If missing, attempts to geocode using Google Maps API
 * 
 * @param location - Partial location that may be missing data
 * @returns Complete location with coordinates, or original if geocoding fails
 */
export async function ensureLocationData(location: PartialLocation): Promise<Location> {
  // Check if location already has valid coordinates
  const hasValidCoordinates = 
    typeof location.lat === 'number' && 
    typeof location.lng === 'number' &&
    !isNaN(location.lat) && 
    !isNaN(location.lng) &&
    location.lat >= -90 && 
    location.lat <= 90 &&
    location.lng >= -180 && 
    location.lng <= 180;

  // If we have valid coordinates, return as is (no need for place_id)
  if (hasValidCoordinates) {
    return {
      name: location.name,
      lat: location.lat!,
      lng: location.lng!,
      place_id: location.place_id,
    };
  }

  // Missing coordinates, attempt to geocode
  console.log(`Location "${location.name}" missing coordinates, attempting to geocode...`);
  const geocoded = await geocodeLocation(location.name);
  
  if (geocoded) {
    return {
      name: location.name,
      lat: geocoded.lat,
      lng: geocoded.lng,
      place_id: geocoded.place_id,
    };
  }

  // Geocoding failed, return with default coordinates (0, 0)
  console.warn(`Failed to geocode location "${location.name}", using default coordinates`);
  return {
    name: location.name,
    lat: 0,
    lng: 0,
  };
}

/**
 * Batch geocode multiple locations
 * Processes locations in parallel with a delay to avoid rate limiting
 * 
 * @param locations - Array of partial locations
 * @param delayMs - Delay between requests in milliseconds (default: 200ms)
 * @returns Array of complete locations
 */
export async function batchGeocodeLocations(
  locations: PartialLocation[],
  delayMs: number = 200
): Promise<Location[]> {
  const results: Location[] = [];
  
  for (let i = 0; i < locations.length; i++) {
    const location = locations[i];
    const result = await ensureLocationData(location);
    results.push(result);
    
    // Add delay between requests to avoid rate limiting (except for last item)
    if (i < locations.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}
