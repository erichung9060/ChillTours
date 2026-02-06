/**
 * Google Maps Renderer
 *
 * Renders map using Google Maps API with AdvancedMarkerElement
 */

"use client";

import { useEffect, useCallback, useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from "@vis.gl/react-google-maps";
import { useTheme } from "@/hooks/use-theme";
import type { Activity } from "@/types/itinerary";
import type { MapRendererProps } from "./types";

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

// Map content component that uses the map instance
function MapContent({
  activities,
  highlightedActivities,
  onMarkerClick,
  getMarkerIcon,
  selectedActivity,
  onInfoWindowClose,
}: MapRendererProps) {
  const map = useMap();
  const [infoWindowPosition, setInfoWindowPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Fit bounds when map loads or activities change
  useEffect(() => {
    if (map && activities.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      activities.forEach((activity) => {
        bounds.extend({
          lat: activity.location.lat,
          lng: activity.location.lng,
        });
      });
      map.fitBounds(bounds);
    }
  }, [map, activities]);

  // Check if a location is visible in the current map bounds
  const isLocationVisible = useCallback(
    (lat: number, lng: number): boolean => {
      if (!map) return true;

      try {
        const bounds = map.getBounds();
        if (!bounds) return true;

        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();

        return (
          lat >= sw.lat() &&
          lat <= ne.lat() &&
          lng >= sw.lng() &&
          lng <= ne.lng()
        );
      } catch (error) {
        console.error("Error checking location visibility:", error);
        return true;
      }
    },
    [map]
  );

  // Smart zoom when hovering over activities or selecting a day
  useEffect(() => {
    if (!map || highlightedActivities.length === 0) return;

    // Check if any highlighted activity is outside the visible bounds
    const hasInvisibleActivity = highlightedActivities.some(
      (activity) =>
        !isLocationVisible(activity.location.lat, activity.location.lng)
    );

    if (!hasInvisibleActivity) return; // All activities are visible, no need to zoom

    // Calculate bounds to include all highlighted activities
    const locations = highlightedActivities.map((a) => a.location);

    try {
      const bounds = new google.maps.LatLngBounds();
      locations.forEach((location) => {
        bounds.extend({ lat: location.lat, lng: location.lng });
      });

      map.fitBounds(bounds, 100);

      // Limit max zoom for single points
      if (locations.length === 1) {
        setTimeout(() => {
          if (map) {
            const currentZoom = map.getZoom();
            if (currentZoom && currentZoom > 15) {
              map.setZoom(15);
            }
          }
        }, 100);
      }
    } catch (error) {
      console.error("Error fitting bounds:", error);
    }
  }, [map, highlightedActivities, isLocationVisible]);

  const handleMarkerClick = useCallback(
    (activity: Activity) => {
      setInfoWindowPosition({
        lat: activity.location.lat,
        lng: activity.location.lng,
      });
      onMarkerClick(activity);
    },
    [onMarkerClick]
  );

  const handleInfoWindowCloseClick = useCallback(() => {
    setInfoWindowPosition(null);
    onInfoWindowClose();
  }, [onInfoWindowClose]);

  return (
    <>
      {/* Render markers for all activities */}
      {activities.map((activity) => {
        const iconData = getMarkerIcon(activity);

        return (
          <AdvancedMarker
            key={activity.id}
            position={{
              lat: activity.location.lat,
              lng: activity.location.lng,
            }}
            onClick={() => handleMarkerClick(activity)}
            title={activity.title}
          >
            <img
              src={iconData.url}
              width={iconData.width}
              height={iconData.height}
              alt={activity.title}
              style={{ cursor: "pointer" }}
            />
          </AdvancedMarker>
        );
      })}

      {/* Info window for selected activity */}
      {selectedActivity && infoWindowPosition && (
        <InfoWindow
          position={infoWindowPosition}
          onCloseClick={handleInfoWindowCloseClick}
        >
          <div className="p-2 max-w-xs">
            <h3 className="font-semibold text-sm mb-1">
              {selectedActivity.title}
            </h3>
            <p className="text-xs text-gray-600 mb-2">
              {selectedActivity.time} • {selectedActivity.duration_minutes} min
            </p>
            <p className="text-xs text-gray-700 mb-2">
              📍 {selectedActivity.location.name}
            </p>
            {selectedActivity.description && (
              <p className="text-xs text-gray-600 line-clamp-3">
                {selectedActivity.description}
              </p>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export function GoogleMapRenderer({
  activities,
  mapCenter,
  mapZoom,
  selectedActivity,
  highlightedActivities,
  onMarkerClick,
  onInfoWindowClose,
  getMarkerIcon,
}: MapRendererProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const { resolvedTheme } = useTheme();

  if (!apiKey) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/20">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-destructive"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Map Error</h3>
          <p className="text-sm text-muted-foreground">
            Google Maps API key not configured
          </p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        style={mapContainerStyle}
        defaultCenter={mapCenter}
        defaultZoom={mapZoom}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
        colorScheme={resolvedTheme === "dark" ? "DARK" : "LIGHT"}
      >
        <MapContent
          activities={activities}
          mapCenter={mapCenter}
          mapZoom={mapZoom}
          selectedActivity={selectedActivity}
          highlightedActivities={highlightedActivities}
          onMarkerClick={onMarkerClick}
          onInfoWindowClose={onInfoWindowClose}
          getMarkerIcon={getMarkerIcon}
        />
      </Map>
    </APIProvider>
  );
}
