/**
 * Single Day View Component
 *
 * Displays one day at a time with navigation arrows.
 */

"use client";

import { useLocale } from "next-intl";

import { Button } from "@/components/ui/button";
import { DayActivitiesList } from "../components/day-activities-list";
import { DayTimeEditor } from "../components/day-time-editor";
import { formatDayHeader } from "@/lib/utils/date";
import { calculateDayDate } from "@/lib/utils/date";
import type { SingleDayViewProps } from "../types";

export function SingleDayView({
  itinerary,
  currentDayIndex,
  draggingActivityId,
  crossDayDragInfo,
  goToPreviousDay,
  goToNextDay,
  onActivityHover,
  optimizeDay,
  isOptimizingDay,
  optimizeDayFull,
  isOptimizingDayFull,
  setDayTimeWindow,
  setAllDaysTimeWindow,
}: SingleDayViewProps) {
  const locale = useLocale();
  const day = itinerary.days[currentDayIndex];
  if (!day) return null;
  const formattedDate = formatDayHeader(
    calculateDayDate(itinerary.start_date, day.day_number),
    locale
  );

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
          {setDayTimeWindow && setAllDaysTimeWindow && (
            <div className="flex justify-center mt-1">
              <DayTimeEditor
                dayNumber={day.day_number}
                startTime={day.start_time ?? "09:00"}
                endTime={day.end_time ?? "20:00"}
                onSave={setDayTimeWindow}
                onApplyAll={setAllDaysTimeWindow}
              />
            </div>
          )}
          {day.activities.length >= 2 && (
            <div className="flex gap-1 mt-1 justify-center">
              {optimizeDay && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2"
                  disabled={isOptimizingDay !== null || isOptimizingDayFull !== null}
                  onClick={() => optimizeDay(day.day_number)}
                >
                  {isOptimizingDay === day.day_number ? (
                    <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  )}
                  {isOptimizingDay === day.day_number ? "優化中…" : "快速優化"}
                </Button>
              )}
              {optimizeDayFull && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2"
                  disabled={isOptimizingDay !== null || isOptimizingDayFull !== null}
                  onClick={() => optimizeDayFull(day.day_number)}
                >
                  {isOptimizingDayFull === day.day_number ? (
                    <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  )}
                  {isOptimizingDayFull === day.day_number ? "優化中…" : "完整優化"}
                </Button>
              )}
            </div>
          )}
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
