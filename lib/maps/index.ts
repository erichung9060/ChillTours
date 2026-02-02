/**
 * Maps Library
 * 
 * Public API for map functionality.
 * Use MapProvider interface for all map operations.
 */

// Provider abstraction (recommended way to use maps)
export {
  getMapProvider,
  getConfiguredProviderType,
  resetProviders,
} from './provider-factory';

export type {
  MapProvider,
  MapProviderType,
  MapConfig,
  MarkerConfig,
  MarkerIcon,
  InfoWindowConfig,
  PlaceDetails,
} from './types';

// Pin icon utilities
export {
  generatePinIcon,
  PIN_CONFIGS,
  clearIconCache,
  type PinIconOptions,
  type PinIconResult,
} from './pin-icons';

// Geocoding utilities
export {
  geocodeLocation,
  ensureLocationData,
  batchGeocodeLocations,
  type PartialLocation,
} from './geocoding';
