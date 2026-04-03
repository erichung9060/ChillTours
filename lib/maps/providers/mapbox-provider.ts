/**
 * Mapbox Provider Implementation
 *
 * Implements the MapProvider interface for Mapbox
 * Note: This is a basic implementation. Full integration requires:
 * - Installing mapbox-gl package: npm install mapbox-gl
 * - Installing React wrapper: npm install react-map-gl
 * - Creating a Mapbox account and getting an API key
 */

import type { MapProvider, MapConfig, MarkerIcon } from "../types";
import { generatePinIcon } from "../pin-icons";

export class MapboxProvider implements MapProvider {
  name: "mapbox" = "mapbox";

  async initialize(_config: MapConfig): Promise<void> {
    // Mapbox initialization would be handled by react-map-gl
    // This method is here for interface consistency
    return Promise.resolve();
  }

  createMarkerIcon(config: {
    color: string;
    size: { width: number; height: number };
  }): MarkerIcon {
    const { color, size } = config;

    // Use the unified pin icon generator
    return generatePinIcon({
      color,
      width: size.width,
      height: size.height,
    });
  }
}
