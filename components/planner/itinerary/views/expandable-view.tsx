/**
 * Expandable View Component
 *
 * Displays days in an accordion-style view with expandable/collapsible sections.
 */

"use client";

import { useLocale } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DayActivitiesList } from "../components/day-activities-list";
import { DayTimeEditor } from "../components/day-time-editor";
import { formatDayHeader } from "@/lib/utils/date";
import { calculateDayDate } from "@/lib/utils/date";
import type { ExpandableViewProps } from "../types";

export function ExpandableView({
  itinerary,
  draggingActivityId,
  crossDayDragInfo,
  expandedDays,
  toggleDay,
  onDayHover,
  onActivityHover,
  optimizeDay,
  isOptimizingDay,
  optimizeDayFull,
  isOptimizingDayFull,
  setDayTimeWindow,
  setAllDaysTimeWindow,
}: ExpandableViewProps) {
  const locale = useLocale();

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {itinerary.days.map((day) => {
        const isExpanded = expandedDays.has(day.day_number);
        const formattedDate = formatDayHeader(
          calculateDayDate(itinerary.start_date, day.day_number),
          locale
        );

        return (
          <Card key={day.day_number} className="overflow-hidden">
            <CardHeader
              className="cursor-pointer hover:bg-accent/50 transition-colors p-4"
              onClick={() => toggleDay(day.day_number)}
              onMouseEnter={() => onDayHover?.(day.day_number)}
              onMouseLeave={() => onDayHover?.(null)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base font-semibold">
                    Day {day.day_number}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formattedDate}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">
                      {day.activities.length}{" "}
                      {day.activities.length === 1 ? "activity" : "activities"}
                    </p>
                    {setDayTimeWindow && setAllDaysTimeWindow && (
                      <DayTimeEditor
                        dayNumber={day.day_number}
                        startTime={day.start_time ?? "09:00"}
                        endTime={day.end_time ?? "20:00"}
                        onSave={setDayTimeWindow}
                        onApplyAll={setAllDaysTimeWindow}
                      />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {optimizeDay && day.activities.length >= 2 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2"
                      disabled={isOptimizingDay !== null || isOptimizingDayFull !== null}
                      onClick={(e) => { e.stopPropagation(); optimizeDay(day.day_number); }}
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
                      {isOptimizingDay === day.day_number ? "Optimizing…" : "快速優化"}
                    </Button>
                  )}
                  {optimizeDayFull && day.activities.length >= 2 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2"
                      disabled={isOptimizingDay !== null || isOptimizingDayFull !== null}
                      onClick={(e) => { e.stopPropagation(); optimizeDayFull(day.day_number); }}
                    >
                      {isOptimizingDayFull === day.day_number ? (
                        <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      )}
                      {isOptimizingDayFull === day.day_number ? "Enriching…" : "完整優化"}
                    </Button>
                  )}
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
                  className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="p-4 pt-0">
                <DayActivitiesList
                  day={day}
                  draggingActivityId={draggingActivityId}
                  crossDayDragInfo={crossDayDragInfo}
                  onActivityHover={onActivityHover}
                />
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
