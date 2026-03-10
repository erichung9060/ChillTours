/**
 * Side-by-Side View Component
 *
 * Displays all days in horizontal columns.
 */

"use client";

import { useLocale } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DayActivitiesList } from "../components/day-activities-list";
import { DayTimeEditor } from "../components/day-time-editor";
import { formatDayHeader } from "@/lib/utils/date";
import { calculateDayDate } from "@/lib/utils/date";
import type { SideBySideViewProps } from "../types";

export function SideBySideView({
  itinerary,
  draggingActivityId,
  crossDayDragInfo,
  onDayHover,
  onActivityHover,
  optimizeDay,
  isOptimizingDay,
  optimizeDayFull,
  isOptimizingDayFull,
  setDayTimeWindow,
  setAllDaysTimeWindow,
}: SideBySideViewProps) {
  const locale = useLocale();

  return (
    <div className="flex-1 overflow-x-auto overflow-y-auto">
      <div className="flex gap-4 p-4 min-w-max h-full">
        {itinerary.days.map((day) => {
          const formattedDate = formatDayHeader(
            calculateDayDate(itinerary.start_date, day.day_number),
            locale
          );
          const isOptimizing = isOptimizingDay === day.day_number;
          const isOptimizingFull = isOptimizingDayFull === day.day_number;

          return (
            <div key={day.day_number} className="w-80 flex-shrink-0">
              <Card className="h-full flex flex-col">
                <CardHeader
                  className="p-4 border-b border-border"
                  onMouseEnter={() => onDayHover?.(day.day_number)}
                  onMouseLeave={() => onDayHover?.(null)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-semibold">
                        Day {day.day_number}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formattedDate}
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
                    {day.activities.length >= 2 && (
                      <div className="flex gap-1 shrink-0">
                        {optimizeDay && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2"
                            disabled={isOptimizingDay !== null || isOptimizingDayFull !== null}
                            onClick={() => optimizeDay(day.day_number)}
                          >
                            {isOptimizing ? (
                              <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <svg className="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                              </svg>
                            )}
                            {isOptimizing ? "優化中…" : "快速優化"}
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
                            {isOptimizingFull ? (
                              <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <svg className="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                              </svg>
                            )}
                            {isOptimizingFull ? "優化中…" : "完整優化"}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 flex-1 overflow-y-auto">
                  <DayActivitiesList
                    day={day}
                    draggingActivityId={draggingActivityId}
                    crossDayDragInfo={crossDayDragInfo}
                    onActivityHover={onActivityHover}
                  />
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
