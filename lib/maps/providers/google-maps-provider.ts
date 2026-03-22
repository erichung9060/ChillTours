/**
 * Google Maps Provider Implementation
 *
 * Implements the MapProvider interface for Google Maps
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

export class GoogleMapsProvider implements MapProvider {
  name: "google" = "google";

  async initialize(_config: MapConfig): Promise<void> {
    // Google Maps initialization is handled by @react-google-maps/api
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

  async getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
    if (!window.google || !window.google.maps) {
      console.error("Google Maps API not loaded");
      return null;
    }

    const service = new window.google.maps.places.PlacesService(
      document.createElement("div")
    );

    return new Promise((resolve) => {
      service.getDetails(
        {
          placeId,
          fields: [
            "place_id",
            "name",
            "geometry",
            "photos",
            "rating",
            "url",
            "formatted_phone_number",
            "website",
            "opening_hours",
          ],
        },
        (place, status) => {
          if (
            status === window.google.maps.places.PlacesServiceStatus.OK &&
            place
          ) {
            const details: PlaceDetails = {
              id: place.place_id || placeId,
              name: place.name || "",
              location: {
                lat: place.geometry?.location?.lat() || 0,
                lng: place.geometry?.location?.lng() || 0,
              },
              rating: place.rating,
              photos: place.photos?.map((photo) =>
                photo.getUrl({ maxWidth: 400 })
              ),
              url: place.url,
              phone: place.formatted_phone_number,
              website: place.website,
              openingHours: place.opening_hours?.weekday_text,
            };
            resolve(details);
          } else {
            resolve(null);
          }
        }
      );
    });
  }
}
