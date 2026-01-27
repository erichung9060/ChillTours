/**
 * Map Provider Factory
 * 
 * Creates and manages map provider instances based on configuration
 */

import type { MapProvider, MapProviderType } from './types';
import { GoogleMapsProvider } from './providers/google-maps-provider';
import { MapboxProvider } from './providers/mapbox-provider';

// Singleton instances
let googleMapsInstance: GoogleMapsProvider | null = null;
let mapboxInstance: MapboxProvider | null = null;

/**
 * Get the configured map provider type from environment
 */
export function getConfiguredProviderType(): MapProviderType {
  const providerType = process.env.NEXT_PUBLIC_MAP_PROVIDER as MapProviderType;
  
  // Default to Google Maps if not specified or invalid
  if (providerType !== 'google' && providerType !== 'mapbox') {
    return 'google';
  }
  
  return providerType;
}

/**
 * Create or get a map provider instance
 * Uses singleton pattern to reuse provider instances
 */
export function getMapProvider(type?: MapProviderType): MapProvider {
  const providerType = type || getConfiguredProviderType();
  
  switch (providerType) {
    case 'google':
      if (!googleMapsInstance) {
        googleMapsInstance = new GoogleMapsProvider();
      }
      return googleMapsInstance;
      
    case 'mapbox':
      if (!mapboxInstance) {
        mapboxInstance = new MapboxProvider();
      }
      return mapboxInstance;
      
    default:
      throw new Error(`Unknown map provider: ${providerType}`);
  }
}

/**
 * Reset provider instances (useful for testing)
 */
export function resetProviders(): void {
  googleMapsInstance = null;
  mapboxInstance = null;
}
