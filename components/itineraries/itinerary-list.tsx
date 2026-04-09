"use client";

import { ItineraryCard } from "./itinerary-card";
import type { ItinerarySummary } from "@/lib/supabase/itineraries";

interface ItineraryListProps {
  itineraries: ItinerarySummary[];
  onCardClick: (id: string) => void;
}

/**
 * ItineraryList Component
 *
 * Displays a responsive grid of itinerary cards.
 * Layout automatically adapts to screen width using auto-fit:
 * - Cards have minimum width of 320px
 * - Grid automatically fills available space with as many columns as fit
 *
 * Requirements: 2.2, 6.1, 6.2, 6.3, 6.4
 */
export function ItineraryList({ itineraries, onCardClick }: ItineraryListProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
      {itineraries.map((itinerary) => (
        <ItineraryCard key={itinerary.id} itinerary={itinerary} onClick={onCardClick} />
      ))}
    </div>
  );
}
