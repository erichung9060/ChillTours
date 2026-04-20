/**
 * Side-by-Side View Component
 *
 * Displays all days in horizontal columns.
 */

"use client";

import { useLocale } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  onActivityClick,
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
            locale,
          );

          return (
            <div key={day.day_number} className="w-80 flex-shrink-0">
              <Card className="h-full flex flex-col">
                <CardHeader
                  className="p-4 border-b border-border"
                  onMouseEnter={() => onDayHover?.(day.day_number)}
                  onMouseLeave={() => onDayHover?.(null)}
                >
                  <CardTitle className="text-base font-semibold">Day {day.day_number}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{formattedDate}</p>
                  {setDayTimeWindow && setAllDaysTimeWindow && (
                    <DayTimeEditor
                      dayNumber={day.day_number}
                      startTime={day.start_time}
                      endTime={day.end_time}
                      onSave={setDayTimeWindow}
                      onApplyAll={setAllDaysTimeWindow}
                    />
                  )}
                </CardHeader>
                <CardContent className="p-4 flex-1 overflow-y-auto">
                  <DayActivitiesList
                    day={day}
                    draggingActivityId={draggingActivityId}
                    crossDayDragInfo={crossDayDragInfo}
                    onActivityHover={onActivityHover}
                    onActivityClick={onActivityClick}
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
