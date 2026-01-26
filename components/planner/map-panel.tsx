/**
 * Map Panel Component
 * 
 * Displays Google Maps with location pins for all activities.
 * Center panel in the three-panel layout.
 * 
 * Features:
 * - Shows all activity locations as pins
 * - Highlights pins when hovering over day or activity
 * - Displays location details on pin click
 * - Auto-fits bounds to show all locations
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import type { Itinerary, Activity, Location } from '@/types/itinerary';
import { calculateMapBounds } from '@/lib/maps';
import { generatePinIcon, PIN_CONFIGS } from '@/lib/maps/pin-icons';

interface MapPanelProps {
  itinerary: Itinerary;
  hoveredDayNumber?: number | null;
  hoveredActivityId?: string | null;
  onActivityClick?: (activityId: string) => void;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

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
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places'],
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(2);

  // Collect all activities with their locations
  const allActivities = itinerary.days.flatMap(day => 
    day.activities.map(activity => ({
      ...activity,
      dayNumber: day.day_number,
    }))
  );

  // Get all unique locations
  const allLocations = allActivities.map(a => a.location);

  // Calculate map bounds when itinerary changes
  useEffect(() => {
    if (allLocations.length > 0) {
      const bounds = calculateMapBounds(allLocations);
      setMapCenter(bounds.center);
      setMapZoom(bounds.zoom);
    }
  }, [itinerary]);

  // Fit bounds when map loads or activities change
  useEffect(() => {
    if (mapRef.current && allLocations.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      allLocations.forEach(loc => {
        bounds.extend({ lat: loc.lat, lng: loc.lng });
      });
      mapRef.current.fitBounds(bounds);
    }
  }, [mapRef.current, allLocations.length]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // Determine if an activity should be highlighted
  const isActivityHighlighted = useCallback((activity: Activity & { dayNumber: number }) => {
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

  // Determine marker icon based on highlight state
  const getMarkerIcon = useCallback((activity: Activity & { dayNumber: number }) => {
    const isHighlighted = isActivityHighlighted(activity);
    
    const config = isHighlighted ? PIN_CONFIGS.highlighted : PIN_CONFIGS.default;
    
    return generatePinIcon({
      color: config.color,
      width: config.width,
      height: config.height,
      activityId: activity.id,
    });
  }, [isActivityHighlighted]);

  if (loadError) {
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
            Failed to load Google Maps
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/20">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
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
              className="text-primary"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Loading Map...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={mapZoom}
        onLoad={onMapLoad}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        }}
      >
        {/* Render markers for all activities */}
        {allActivities.map((activity) => (
          <Marker
            key={activity.id}
            position={{ lat: activity.location.lat, lng: activity.location.lng }}
            icon={getMarkerIcon(activity)}
            onClick={() => {
              setSelectedActivity(activity);
              onActivityClick?.(activity.id);
            }}
            title={activity.title}
          />
        ))}

        {/* Info window for selected activity */}
        {selectedActivity && (
          <InfoWindow
            position={{
              lat: selectedActivity.location.lat,
              lng: selectedActivity.location.lng,
            }}
            onCloseClick={() => setSelectedActivity(null)}
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
      </GoogleMap>
    </div>
  );
}
