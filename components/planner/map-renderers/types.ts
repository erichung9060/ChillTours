/**
 * Map Renderer Types
 *
 * Common types for all map renderers
 */

import type { Activity, ActivityWithDay } from "@/types/itinerary";
import type { PinIconResult } from "@/lib/maps/pin-icons";

export interface MapRendererProps {
  activities: ActivityWithDay[];
  selectedActivity: Activity | null;
  highlightedActivities: ActivityWithDay[];
  focusedActivityId?: string | null;
  onMarkerClick: (activity: Activity) => void;
  onInfoWindowClose: () => void;
  onFocusComplete: () => void;
  getMarkerIcon: (activity: ActivityWithDay) => PinIconResult;
  locale: string;
}
