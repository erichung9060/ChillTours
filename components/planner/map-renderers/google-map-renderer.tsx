/**
 * Google Maps Renderer
 *
 * Renders map using Google Maps API with AdvancedMarkerElement
 */

"use client";

import { useEffect, useCallback, useMemo } from "react";
import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import { useTheme } from "@/hooks/use-theme";
import type { Activity } from "@/types/itinerary";
import type { MapRendererProps } from "./types";
import { MapInfoWindowContent } from "./map-info-window-content";

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

// Map content component that uses the map instance
function MapContent({
  activities,
  highlightedActivities,
  focusedActivityId,
  onMarkerClick,
  getMarkerIcon,
  selectedActivity,
  onInfoWindowClose,
  onFocusComplete,
}: MapRendererProps) {
  const map = useMap();

  const infoWindowPosition = useMemo(() => {
    if (!selectedActivity) return null;
    return {
      lat: selectedActivity.location.lat as number,
      lng: selectedActivity.location.lng as number,
    };
  }, [selectedActivity]);

  // Fit bounds when map loads or activities change
  useEffect(() => {
    if (!map || activities.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    activities.forEach((activity) => {
      bounds.extend({
        lat: activity.location.lat as number,
        lng: activity.location.lng as number,
      });
    });

    // Only fit bounds if we have valid points
    if (!bounds.isEmpty()) {
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

        return lat >= sw.lat() && lat <= ne.lat() && lng >= sw.lng() && lng <= ne.lng();
      } catch (error) {
        console.error("Error checking location visibility:", error);
        return true;
      }
    },
    [map],
  );

  // Focus effect — pans & zooms map to focused activity.
  useEffect(() => {
    if (!map || !focusedActivityId) return;

    const target = activities.find((a) => a.id === focusedActivityId);
    if (!target) return;

    map.panTo({
      lat: target.location.lat as number,
      lng: target.location.lng as number,
    });
    map.setZoom(15);

    onFocusComplete();
  }, [map, focusedActivityId, activities, onFocusComplete]);

  // Smart zoom — fitBounds only when highlighted activities are outside viewport
  useEffect(() => {
    if (!map || highlightedActivities.length === 0) return;

    const hasInvisibleActivity = highlightedActivities.some(
      (activity) =>
        !isLocationVisible(activity.location.lat as number, activity.location.lng as number),
    );

    if (!hasInvisibleActivity) return;

    try {
      const bounds = new google.maps.LatLngBounds();
      highlightedActivities.forEach((a) => {
        bounds.extend({
          lat: a.location.lat as number,
          lng: a.location.lng as number,
        });
      });

      map.fitBounds(bounds, 100);

      if (highlightedActivities.length === 1) {
        const currentZoom = map.getZoom();
        if (currentZoom && currentZoom > 15) {
          map.setZoom(15);
        }
      }
    } catch (error) {
      console.error("Error fitting bounds:", error);
    }
  }, [map, highlightedActivities, isLocationVisible]);

  const handleMarkerClick = useCallback(
    (activity: Activity) => {
      onMarkerClick(activity);
    },
    [onMarkerClick],
  );

  const handleInfoWindowCloseClick = useCallback(() => {
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
              lat: activity.location.lat as number,
              lng: activity.location.lng as number,
            }}
            onClick={() => handleMarkerClick(activity)}
            title={activity.title}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- marker icons are rendered inside the Maps SDK overlay, next/image is not applicable here */}
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
        <InfoWindow position={infoWindowPosition} onCloseClick={handleInfoWindowCloseClick}>
          <MapInfoWindowContent activity={selectedActivity} />
        </InfoWindow>
      )}
    </>
  );
}

export function GoogleMapRenderer({
  activities,
  selectedActivity,
  highlightedActivities,
  focusedActivityId,
  onMarkerClick,
  onInfoWindowClose,
  onFocusComplete,
  getMarkerIcon,
  locale,
}: MapRendererProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const { resolvedTheme } = useTheme();

  const fallbackCenter = { lat: 0, lng: 0 };
  const fallbackZoom = 2;

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
          <p className="text-sm text-muted-foreground">Google Maps API key not configured</p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} language={locale}>
      <Map
        style={mapContainerStyle}
        defaultCenter={fallbackCenter}
        defaultZoom={fallbackZoom}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}
        colorScheme={resolvedTheme === "dark" ? "DARK" : "LIGHT"}
      >
        <MapContent
          activities={activities}
          selectedActivity={selectedActivity}
          highlightedActivities={highlightedActivities}
          focusedActivityId={focusedActivityId}
          onMarkerClick={onMarkerClick}
          onInfoWindowClose={onInfoWindowClose}
          onFocusComplete={onFocusComplete}
          getMarkerIcon={getMarkerIcon}
          locale={locale}
        />
      </Map>
    </APIProvider>
  );
}
