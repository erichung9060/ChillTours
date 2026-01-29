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

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Itinerary, Activity, ActivityWithDay } from '@/types/itinerary';
import { getMapProvider, getConfiguredProviderType, PIN_CONFIGS } from '@/lib/maps';
import { GoogleMapRenderer } from './map-renderers/google-map-renderer';
import { MapboxMapRenderer } from './map-renderers/mapbox-map-renderer';

interface MapPanelProps {
  itinerary: Itinerary;
  hoveredDayNumber?: number | null;
  hoveredActivityId?: string | null;
  onActivityClick?: (activityId: string) => void;
}

const defaultCenter = {
  lat: 0,
  lng: 0,
};

export function MapPanel({ 
  itinerary, 
  hoveredDayNumber, 
  hoveredActivityId,
  onActivityClick 
}: MapPanelProps) {
  // Get the map provider (abstraction layer)
  const mapProvider = getMapProvider();
  const providerType = getConfiguredProviderType();
  
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(2);

  // Collect all activities with their day numbers (memoized to prevent unnecessary re-renders)
  const allActivities = useMemo<ActivityWithDay[]>(() => 
    itinerary.days.flatMap(day => 
      day.activities.map(activity => ({
        ...activity,
        dayNumber: day.day_number,
      }))
    ), [itinerary]
  );

  // Get all unique locations
  const allLocations = useMemo(() => 
    allActivities.map(a => a.location), 
    [allActivities]
  );

  // Calculate map bounds when itinerary changes
  useEffect(() => {
    if (allLocations.length > 0) {
      const bounds = mapProvider.calculateBounds(allLocations);
      setMapCenter(bounds.center);
      setMapZoom(bounds.zoom);
    }
  }, [itinerary, mapProvider]);

  // Determine if an activity should be highlighted
  const isActivityHighlighted = useCallback((activity: ActivityWithDay) => {
    // If hovering over a specific activity, only highlight that one
    if (hoveredActivityId) {
      return hoveredActivityId === activity.id;
    }
    // If hovering over a day, highlight all activities in that day
    if (hoveredDayNumber) {
      return hoveredDayNumber === activity.dayNumber;
    }
    return false;
  }, [hoveredActivityId, hoveredDayNumber]);

  // Determine marker icon based on highlight state (using provider abstraction)
  const getMarkerIcon = useCallback((activity: ActivityWithDay) => {
    const isHighlighted = isActivityHighlighted(activity);
    const config = isHighlighted ? PIN_CONFIGS.highlighted : PIN_CONFIGS.default;
    
    // Use provider to create marker icon
    return mapProvider.createMarkerIcon({
      color: config.color,
      size: { width: config.width, height: config.height },
      activityId: activity.id,
    });
  }, [isActivityHighlighted, mapProvider]);

  const handleMarkerClick = useCallback((activity: Activity) => {
    setSelectedActivity(activity);
    onActivityClick?.(activity.id);
  }, [onActivityClick]);

  const handleInfoWindowClose = useCallback(() => {
    setSelectedActivity(null);
  }, []);

  // Common props for all renderers
  const rendererProps = {
    activities: allActivities,
    mapCenter,
    mapZoom,
    selectedActivity,
    onMarkerClick: handleMarkerClick,
    onInfoWindowClose: handleInfoWindowClose,
    getMarkerIcon,
  };

  // Render the appropriate map based on provider type
  return (
    <div className="w-full h-full relative">
      {providerType === 'mapbox' ? (
        <MapboxMapRenderer {...rendererProps} />
      ) : (
        <GoogleMapRenderer {...rendererProps} />
      )}
    </div>
  );
}
