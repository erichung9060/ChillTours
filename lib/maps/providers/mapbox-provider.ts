/**
 * Mapbox Provider Implementation
 *
 * Implements the MapProvider interface for Mapbox
 * Note: This is a basic implementation. Full integration requires:
 * - Installing mapbox-gl package: npm install mapbox-gl
 * - Installing React wrapper: npm install react-map-gl
 * - Creating a Mapbox account and getting an API key
 */

import type { Location } from "@/types/itinerary";
import type {
  MapProvider,
  MapConfig,
  MarkerIcon,
  PlaceDetails,
} from "../types";
import { calculateMapBounds } from "../client";
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

  calculateBounds(locations: Location[]): {
    center: { lat: number; lng: number };
    zoom: number;
  } {
    return calculateMapBounds(locations);
  }

  createNavigationLink(location: Location): string {
    const { name, place_id } = location;

    if (place_id) {
      return `https://www.google.com/maps/search/?api=1&query_place_id=${place_id}`;
    } else {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
    }
  }

  async geocodeAddress(locationName: string): Promise<Location | null> {
    // Mapbox Geocoding API implementation
    // Requires: NEXT_PUBLIC_MAPBOX_API_KEY environment variable
    const apiKey = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;

    if (!apiKey) {
      console.error("Mapbox API key not configured");
      return null;
    }

    try {
      const encodedLocation = encodeURIComponent(locationName);
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedLocation}.json?access_token=${apiKey}&limit=1`
      );

      if (!response.ok) {
        throw new Error("Geocoding request failed");
      }

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [lng, lat] = feature.center;

        return {
          name: feature.place_name || locationName,
          lat,
          lng,
          place_id: feature.id,
        };
      }

      return null;
    } catch (error) {
      console.error("Mapbox geocoding error:", error);
      return null;
    }
  }

  async getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
    // Mapbox Geocoding API - Retrieve a feature
    // https://docs.mapbox.com/api/search/geocoding/#retrieve-a-feature
    const apiKey = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;

    if (!apiKey) {
      console.error("Mapbox API key not configured");
      return null;
    }

    try {
      // Mapbox place IDs have format like "poi.123456789"
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(placeId)}.json?access_token=${apiKey}`
      );

      if (!response.ok) {
        throw new Error("Place details request failed");
      }

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [lng, lat] = feature.center;
        const properties = feature.properties || {};

        const details: PlaceDetails = {
          id: feature.id,
          name: feature.text || "",
          location: {
            lat,
            lng,
          },
          // Mapbox doesn't provide these fields in the basic API
          // Would need Mapbox Search Box API for richer data
          rating: undefined,
          photos: undefined,
          url: undefined,
          phone: properties.tel,
          website: properties.website,
          openingHours: undefined,
        };

        return details;
      }

      return null;
    } catch (error) {
      console.error("Mapbox place details error:", error);
      return null;
    }
  }
}
