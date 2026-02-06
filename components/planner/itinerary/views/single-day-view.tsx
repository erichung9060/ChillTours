/**
 * Single Day View Component
 *
 * Displays one day at a time with navigation arrows.
 */

"use client";

import { Button } from "@/components/ui/button";
import { DayActivitiesList } from "../components/day-activities-list";
import type { SingleDayViewProps } from "../types";

export function SingleDayView({
  itinerary,
  currentDayIndex,
  draggingActivityId,
  crossDayDragInfo,
  goToPreviousDay,
  goToNextDay,
  onActivityHover,
}: SingleDayViewProps) {
  const day = itinerary.days[currentDayIndex];
  if (!day) return null;

  const formatDayInfo = (date: string) => {
    const dayDate = new Date(date);
    const weekday = dayDate.toLocaleDateString("en-US", { weekday: "long" });
    const monthDay = dayDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return `${weekday}, ${monthDay}`;
  };

  const formattedDate = formatDayInfo(day.date);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Navigation Controls */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-border bg-background">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPreviousDay}
          disabled={currentDayIndex === 0}
          className="h-8 w-8 p-0"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Button>

        <div className="text-center">
          <h2 className="text-lg font-semibold">Day {day.day_number}</h2>
          <p className="text-sm text-muted-foreground">{formattedDate}</p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={goToNextDay}
          disabled={currentDayIndex === itinerary.days.length - 1}
          className="h-8 w-8 p-0"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Button>
      </div>

      {/* Day Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <DayActivitiesList
          day={day}
          draggingActivityId={draggingActivityId}
          crossDayDragInfo={crossDayDragInfo}
          onActivityHover={onActivityHover}
        />
      </div>
    </div>
  );
}
