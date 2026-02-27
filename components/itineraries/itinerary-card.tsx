"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { ItinerarySummary } from "@/lib/supabase/itineraries";

interface ItineraryCardProps {
  itinerary: ItinerarySummary;
  onClick: (id: string) => void;
}

/**
 * Format date from YYYY-MM-DD to YYYY / M / D
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // getMonth() returns 0-11
  const day = date.getDate();
  return `${year} / ${month} / ${day}`;
}

/**
 * ItineraryCard Component
 *
 * Displays a single itinerary summary with title, destination, and date range.
 * Supports click navigation and keyboard accessibility.
 *
 * Requirements: 2.3, 3.1, 3.2, 3.3, 3.4, 7.1, 7.2, 7.3
 */
export function ItineraryCard({ itinerary, onClick }: ItineraryCardProps) {
  const handleClick = () => {
    onClick(itinerary.id);
  };

  const startDate = formatDate(itinerary.start_date);
  const endDate = formatDate(itinerary.end_date);

  return (
    <Card
      className="cursor-pointer"
      onClick={handleClick}
    >
      <CardHeader>
        <CardTitle className="text-xl">{itinerary.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <span className="font-medium">目的地：</span>
            <span className="ml-2">{itinerary.destination}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <span className="font-medium">日期：</span>
            <span className="ml-2">
              {startDate} - {endDate}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
