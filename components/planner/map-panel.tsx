/**
 * Map Panel Component
 * 
 * Displays Google Maps with location pins for all activities.
 * Center panel in the three-panel layout.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

'use client';

import type { Itinerary } from '@/types/itinerary';

interface MapPanelProps {
  itinerary: Itinerary;
}

export function MapPanel({ itinerary }: MapPanelProps) {
  // TODO: Implement Google Maps integration in task 15
  // For now, show a placeholder
  
  const totalActivities = itinerary.days.reduce(
    (sum, day) => sum + day.activities.length,
    0
  );

  return (
    <div className="w-full h-full flex items-center justify-center bg-muted/20">
      <div className="text-center p-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
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
        <h3 className="text-lg font-semibold mb-2">Map View</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Google Maps integration coming soon
        </p>
        <p className="text-xs text-muted-foreground">
          {totalActivities} {totalActivities === 1 ? 'location' : 'locations'} to display
        </p>
      </div>
    </div>
  );
}
