/**
 * Map Panel Component
 *
 * Displays map with location pins for all activities.
 * Center panel in the three-panel layout.
 *
 * Features:
 * - Shows all activity locations as pins
 * - Highlights pins when hovering over day or activity
 * - Displays location details on pin click
 * - Auto-fits bounds to show all locations
 * - Automatically selects map provider based on configuration
 *
 * Architecture:
 * - Uses provider abstraction layer
 * - Automatically switches between Google Maps and Mapbox based on NEXT_PUBLIC_MAP_PROVIDER
 * - UI layer is completely agnostic to the map provider
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

"use client";

import { useState, useCallback, useMemo } from "react";
import { useLocale } from "next-intl";
import type { Itinerary, Activity, ActivityWithDay } from "@/types/itinerary";
import {
  getMapProvider,
  getConfiguredProviderType,
} from "@/lib/maps/provider-factory";
import { hasValidCoordinates } from "@/lib/utils/geo";
import { PIN_CONFIGS } from "@/lib/maps/pin-icons";
import { GoogleMapRenderer } from "./map-renderers/google-map-renderer";
import { MapboxMapRenderer } from "./map-renderers/mapbox-map-renderer";

interface MapPanelProps {
  itinerary: Itinerary;
  hoveredDayNumber?: number | null;
  hoveredActivityId?: string | null;
  selectedDayNumber?: number | null;
  onActivityClick?: (activityId: string) => void;
}

export function MapPanel({
  itinerary,
  hoveredDayNumber,
  hoveredActivityId,
  selectedDayNumber,
  onActivityClick,
}: MapPanelProps) {
  // Get the map provider (abstraction layer)
  const providerType = getConfiguredProviderType();
  const locale = useLocale();

  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null
  );

  // Collect all activities with their day numbers (memoized to prevent unnecessary re-renders)
  const allActivities = useMemo<ActivityWithDay[]>(
    () =>
      itinerary.days.flatMap((day) =>
        day.activities.map((activity) => ({
          ...activity,
          dayNumber: day.day_number,
        }))
      ),
    [itinerary]
  );

  // Filter to only activities with valid coordinates for map rendering
  const mappableActivities = useMemo<ActivityWithDay[]>(
    () => allActivities.filter((a) => hasValidCoordinates(a.location)),
    [allActivities]
  );

  // Calculate highlighted activities for highlighting and smart zoom (memoized)
  const highlightedActivities = useMemo(() => {
    return allActivities.filter((activity) => {
      if (hoveredActivityId) {
        return activity.id === hoveredActivityId;
      }
      if (hoveredDayNumber) {
        return activity.dayNumber === hoveredDayNumber;
      }
      if (selectedDayNumber) {
        return activity.dayNumber === selectedDayNumber;
      }
      return false;
    });
  }, [allActivities, hoveredActivityId, hoveredDayNumber, selectedDayNumber]);

  // Determine if an activity should be highlighted
  const isActivityHighlighted = useCallback(
    (activity: ActivityWithDay) => {
      // Reuse the same logic: check if activity is in highlightedActivities
      return highlightedActivities.some((target) => target.id === activity.id);
    },
    [highlightedActivities]
  );

  // Determine marker icon based on highlight state (using provider abstraction)
  const getMarkerIcon = useCallback(
    (activity: ActivityWithDay) => {
      const mapProvider = getMapProvider();
      const isHighlighted = isActivityHighlighted(activity);
      const config = isHighlighted
        ? PIN_CONFIGS.highlighted
        : PIN_CONFIGS.default;

      // Use provider to create marker icon
      return mapProvider.createMarkerIcon({
        color: config.color,
        size: { width: config.width, height: config.height },
      });
    },
    [isActivityHighlighted]
  );

  const handleMarkerClick = useCallback(
    (activity: Activity) => {
      setSelectedActivity(activity);
      onActivityClick?.(activity.id);
    },
    [onActivityClick]
  );

  const handleInfoWindowClose = useCallback(() => {
    setSelectedActivity(null);
  }, []);

  // Common props for all renderers
  const rendererProps = {
    activities: mappableActivities,
    selectedActivity,
    highlightedActivities: highlightedActivities.filter((a) =>
      hasValidCoordinates(a.location)
    ),
    onMarkerClick: handleMarkerClick,
    onInfoWindowClose: handleInfoWindowClose,
    getMarkerIcon,
    locale,
  };

  // Render the appropriate map based on provider type
  return (
    <div className="w-full h-full relative">
      {providerType === "mapbox" ? (
        <MapboxMapRenderer {...rendererProps} />
      ) : (
        <GoogleMapRenderer {...rendererProps} />
      )}
    </div>
  );
}
