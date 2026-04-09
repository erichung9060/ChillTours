/**
 * Google Maps Provider Implementation
 *
 * Implements the MapProvider interface for Google Maps
 */

import type { MapProvider, MapConfig, MarkerIcon } from "../types";
import { generatePinIcon } from "../pin-icons";

export class GoogleMapsProvider implements MapProvider {
  name: "google" = "google";

  async initialize(_config: MapConfig): Promise<void> {
    // Google Maps initialization is handled by @react-google-maps/api
    // This method is here for interface consistency
    return Promise.resolve();
  }

  createMarkerIcon(config: { color: string; size: { width: number; height: number } }): MarkerIcon {
    const { color, size } = config;

    // Use the unified pin icon generator
    return generatePinIcon({
      color,
      width: size.width,
      height: size.height,
    });
  }
}
