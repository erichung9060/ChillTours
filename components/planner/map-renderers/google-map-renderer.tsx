/**
 * Google Maps Renderer
 * 
 * Renders map using Google Maps API
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import type { Activity } from '@/types/itinerary';
import type { MapRendererProps } from './types';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

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
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places'],
  });

  const mapRef = useRef<google.maps.Map | null>(null);

  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // Fit bounds when map loads or activities change
  useEffect(() => {
    if (mapRef.current && activities.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      activities.forEach(activity => {
        bounds.extend({ lat: activity.location.lat, lng: activity.location.lng });
      });
      mapRef.current.fitBounds(bounds);
    }
  }, [activities]);

  // Check if a location is visible in the current map bounds
  const isLocationVisible = useCallback((lat: number, lng: number): boolean => {
    if (!mapRef.current) return true;

    try {
      const bounds = mapRef.current.getBounds();
      if (!bounds) return true;
      
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      
      return lat >= sw.lat() && lat <= ne.lat() && lng >= sw.lng() && lng <= ne.lng();
    } catch (error) {
      console.error('Error checking location visibility:', error);
      return true;
    }
  }, []);

  // Smart zoom when hovering over activities or selecting a day
  useEffect(() => {
    if (!mapRef.current || highlightedActivities.length === 0) return;

    // Check if any highlighted activity is outside the visible bounds
    const hasInvisibleActivity = highlightedActivities.some(activity => 
      !isLocationVisible(activity.location.lat, activity.location.lng)
    );

    if (!hasInvisibleActivity) return; // All activities are visible, no need to zoom

    // Calculate bounds to include all highlighted activities
    const locations = highlightedActivities.map(a => a.location);
    
    try {
      const bounds = new google.maps.LatLngBounds();
      locations.forEach(location => {
        bounds.extend({ lat: location.lat, lng: location.lng });
      });
      
      mapRef.current.fitBounds(bounds, 100);
      
      // Limit max zoom for single points
      if (locations.length === 1) {
        setTimeout(() => {
          if (mapRef.current) {
            const currentZoom = mapRef.current.getZoom();
            if (currentZoom && currentZoom > 15) {
              mapRef.current.setZoom(15);
            }
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error fitting bounds:', error);
    }
  }, [highlightedActivities, isLocationVisible]);

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
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={mapCenter}
      zoom={mapZoom}
      onLoad={handleMapLoad}
      options={{
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
      }}
    >
      {/* Render markers for all activities */}
      {activities.map((activity) => {
        const iconData = getMarkerIcon(activity);
        
        return (
          <Marker
            key={activity.id}
            position={{ lat: activity.location.lat, lng: activity.location.lng }}
            icon={{
              url: iconData.url,
              scaledSize: new google.maps.Size(iconData.width, iconData.height),
              anchor: new google.maps.Point(iconData.anchorX, iconData.anchorY),
            }}
            onClick={() => onMarkerClick(activity)}
            title={activity.title}
          />
        );
      })}

      {/* Info window for selected activity */}
      {selectedActivity && (
        <InfoWindow
          position={{
            lat: selectedActivity.location.lat,
            lng: selectedActivity.location.lng,
          }}
          onCloseClick={onInfoWindowClose}
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
  );
}
