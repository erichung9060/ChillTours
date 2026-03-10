/**
 * Map Renderer Types
 *
 * Common types for all map renderers
 */

import type { Activity, ActivityWithDay } from "@/types/itinerary";
import type { PinIconResult } from "@/lib/maps/pin-icons";

export interface MapRendererProps {
  activities: ActivityWithDay[];
  mapCenter: { lat: number; lng: number };
  mapZoom: number;
  selectedActivity: Activity | null;
  highlightedActivities: ActivityWithDay[];
  onMarkerClick: (activity: Activity) => void;
  onInfoWindowClose: () => void;
  getMarkerIcon: (activity: ActivityWithDay) => PinIconResult;
  locale: string;
}
