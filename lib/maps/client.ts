/**
 * Google Maps Client
 * 
 * Provides utilities for Google Maps integration including
 * geocoding, place details, and navigation links.
 * 
 * Requirements: 6.1, 6.2, 6.4, 6.5, 12.1, 12.2
 */

import type { Location } from '@/types/itinerary';

/**
 * Geocode an address to get lat/lng coordinates
 */
export async function geocodeAddress(address: string): Promise<Location | null> {
  if (!window.google || !window.google.maps) {
    console.error('Google Maps API not loaded');
    return null;
  }

  const geocoder = new window.google.maps.Geocoder();

  try {
    const result = await geocoder.geocode({ address });
    
    if (result.results && result.results.length > 0) {
      const place = result.results[0];
      const location = place.geometry.location;
      
      return {
        name: place.formatted_address || address,
        address: place.formatted_address || address,
        lat: location.lat(),
        lng: location.lng(),
        place_id: place.place_id,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Get place details from a place ID
 */
export async function getPlaceDetails(placeId: string): Promise<any | null> {
  if (!window.google || !window.google.maps) {
    console.error('Google Maps API not loaded');
    return null;
  }

  const service = new window.google.maps.places.PlacesService(
    document.createElement('div')
  );

  return new Promise((resolve) => {
    service.getDetails(
      {
        placeId,
        fields: ['name', 'formatted_address', 'geometry', 'photos', 'rating', 'url'],
      },
      (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          resolve(place);
        } else {
          resolve(null);
        }
      }
    );
  });
}

/**
 * Create a Google Maps navigation link
 * Works on both web and mobile (opens Google Maps app if available)
 */
export function createNavigationLink(location: Location): string {
  const { lat, lng, name } = location;
  
  // Use place_id if available for more accurate navigation
  if (location.place_id) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${location.place_id}`;
  }
  
  // Fallback to coordinates
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/**
 * Create a directions link from current location to destination
 */
export function createDirectionsLink(destination: Location): string {
  const { lat, lng } = destination;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/**
 * Calculate the center point and zoom level for a set of locations
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
