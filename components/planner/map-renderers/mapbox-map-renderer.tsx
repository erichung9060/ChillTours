/**
 * Mapbox Renderer
 *
 * Renders map using Mapbox GL JS
 */

"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState, useCallback } from "react";
import Map, { Marker, Popup } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import { useTheme } from "@/hooks/use-theme";
import type { Activity } from "@/types/itinerary";
import type { MapRendererProps } from "./types";

export function MapboxMapRenderer({
  activities,
  selectedActivity,
  highlightedActivities,
  onMarkerClick,
  onInfoWindowClose,
  getMarkerIcon,
  locale,
}: MapRendererProps) {
  const mapRef = useRef<MapRef>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const { resolvedTheme } = useTheme();

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;

  const fallbackCenter = { lng: 0, lat: 0 };
  const fallbackZoom = 2;

  // Choose map style based on theme
  const mapStyle =
    resolvedTheme === "dark"
      ? "mapbox://styles/mapbox/dark-v11"
      : "mapbox://styles/mapbox/streets-v12";

  useEffect(() => {
    if (!mapboxToken) {
      setLoadError(new Error("Mapbox API key not configured"));
    }
  }, [mapboxToken]);

  const handleMapLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  // Handle container resize using ResizeObserver
  useEffect(() => {
    if (!mapRef.current) return;

    const mapContainer = mapRef.current.getContainer();
    if (!mapContainer) return;

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        // Use requestAnimationFrame to avoid resize loop
        requestAnimationFrame(() => {
          mapRef.current?.resize();
        });
      }
    });

    resizeObserver.observe(mapContainer);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isLoaded]);

  // Fit bounds when activities change
  useEffect(() => {
    if (mapRef.current && activities.length > 0 && isLoaded) {
      const bounds: [[number, number], [number, number]] = [
        [
          Math.min(...activities.map((a) => a.location.lng as number)),
          Math.min(...activities.map((a) => a.location.lat as number)),
        ],
        [
          Math.max(...activities.map((a) => a.location.lng as number)),
          Math.max(...activities.map((a) => a.location.lat as number)),
        ],
      ];

      mapRef.current.fitBounds(bounds, {
        padding: 50,
        duration: 1000,
      });
    }
  }, [activities, isLoaded]);

  // Check if a location is visible in the current map bounds
  const isLocationVisible = useCallback((lat: number, lng: number): boolean => {
    if (!mapRef.current) return true;

    try {
      const bounds = mapRef.current.getBounds();
      if (!bounds) return true;

      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();

      return lat >= sw.lat && lat <= ne.lat && lng >= sw.lng && lng <= ne.lng;
    } catch (error) {
      console.error("Error checking location visibility:", error);
      return true;
    }
  }, []);

  // Smart zoom when hovering over activities or selecting a day
  useEffect(() => {
    if (!mapRef.current || !isLoaded || highlightedActivities.length === 0)
      return;

    // Check if any highlighted activity is outside the visible bounds
    const hasInvisibleActivity = highlightedActivities.some(
      (activity) =>
        !isLocationVisible(
          activity.location.lat as number,
          activity.location.lng as number
        )
    );

    if (!hasInvisibleActivity) return; // All activities are visible, no need to zoom

    // Calculate bounds to include all highlighted activities
    const locations = highlightedActivities.map((a) => a.location);

    try {
      const bounds: [[number, number], [number, number]] = [
        [
          Math.min(...locations.map((l) => l.lng as number)),
          Math.min(...locations.map((l) => l.lat as number)),
        ],
        [
          Math.max(...locations.map((l) => l.lng as number)),
          Math.max(...locations.map((l) => l.lat as number)),
        ],
      ];

      mapRef.current.fitBounds(bounds, {
        padding: 100,
        duration: 800,
        maxZoom: 15,
      });
    } catch (error) {
      console.error("Error fitting bounds:", error);
    }
  }, [highlightedActivities, isLoaded, isLocationVisible]);

  if (loadError || !mapboxToken) {
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
            {loadError?.message || "Failed to load Mapbox"}
          </p>
        </div>
      </div>
    );
  }

  // Convert locale to Mapbox language code (e.g., 'zh-TW' -> 'zh-Hant')
  const mapboxLanguage = locale === 'zh-TW' ? 'zh-Hant' : locale.split('-')[0];

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={mapboxToken}
      initialViewState={{
        longitude: fallbackCenter.lng,
        latitude: fallbackCenter.lat,
        zoom: fallbackZoom,
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle={mapStyle}
      onLoad={handleMapLoad}
      language={mapboxLanguage}
    >
      {/* Render markers for all activities */}
      {activities.map((activity) => {
        const iconData = getMarkerIcon(activity);

        return (
          <Marker
            key={activity.id}
            longitude={activity.location.lng as number}
            latitude={activity.location.lat as number}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onMarkerClick(activity);
            }}
          >
            <div
              style={{
                width: iconData.width,
                height: iconData.height,
                cursor: "pointer",
              }}
              title={activity.title}
            >
              <img
                src={iconData.url}
                alt={activity.title}
                style={{
                  width: "100%",
                  height: "100%",
                }}
              />
            </div>
          </Marker>
        );
      })}

      {/* Popup for selected activity */}
      {selectedActivity && (
        <Popup
          longitude={selectedActivity.location.lng as number}
          latitude={selectedActivity.location.lat as number}
          anchor="bottom"
          onClose={onInfoWindowClose}
          closeButton={true}
          closeOnClick={false}
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
            {selectedActivity.note && (
              <p className="text-xs text-gray-600 line-clamp-3">
                {selectedActivity.note}
              </p>
            )}
          </div>
        </Popup>
      )}
    </Map>
  );
}
