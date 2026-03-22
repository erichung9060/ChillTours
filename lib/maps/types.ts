/**
 * Map Provider Abstraction Types
 *
 * Defines common interfaces for different map providers
 * (Google Maps, Mapbox, etc.)
 */

import type { Location } from "@/types/itinerary";

/**
 * Map configuration
 */
export interface MapConfig {
  center: { lat: number; lng: number };
  zoom: number;
  apiKey: string;
}

/**
 * Marker configuration
 */
export interface MarkerConfig {
  id: string;
  position: { lat: number; lng: number };
  title: string;
  icon?: MarkerIcon;
  onClick?: () => void;
}

/**
 * Marker icon configuration (provider-agnostic)
 */
export interface MarkerIcon {
  url: string;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
}

/**
 * Info window configuration
 */
export interface InfoWindowConfig {
  position: { lat: number; lng: number };
  content: React.ReactNode;
  onClose: () => void;
}

/**
 * Map provider interface
 * All map providers must implement this interface
 */
export interface MapProvider {
  /**
   * Provider name
   */
  name: "google" | "mapbox";

  /**
   * Initialize the map
   */
  initialize(config: MapConfig): Promise<void>;

  /**
   * Create a marker icon
   */
  createMarkerIcon(config: {
    color: string;
    size: { width: number; height: number };
  }): MarkerIcon;

  /**
   * Get place details from a place ID
   * Returns detailed information about a specific place
   */
  getPlaceDetails(placeId: string): Promise<PlaceDetails | null>;
}

/**
 * Place details (provider-agnostic)
 */
export interface PlaceDetails {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  rating?: number;
  photos?: string[];
  url?: string;
  phone?: string;
  website?: string;
  openingHours?: string[];
}

/**
 * Map provider type
 */
export type MapProviderType = "google" | "mapbox";
