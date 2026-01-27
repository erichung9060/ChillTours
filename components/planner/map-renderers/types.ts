/**
 * Map Renderer Types
 * 
 * Common types for all map renderers
 */

import type { Activity } from '@/types/itinerary';
import type { PinIconResult } from '@/lib/maps';

export interface MapRendererProps {
  activities: Array<Activity & { dayNumber: number }>;
  mapCenter: { lat: number; lng: number };
  mapZoom: number;
  selectedActivity: Activity | null;
  onMapLoad?: (map: any) => void;
  onMarkerClick: (activity: Activity) => void;
  onInfoWindowClose: () => void;
  getMarkerIcon: (activity: Activity & { dayNumber: number }) => PinIconResult;
}
