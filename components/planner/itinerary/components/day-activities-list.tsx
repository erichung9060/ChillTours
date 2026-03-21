/**
 * Day Activities List Component
 *
 * Renders a list of activities for a day, handling both empty and populated states.
 * Includes add-mode placeholder rendering driven by global mouse tracking.
 */

"use client";

import { useMemo, useCallback, Fragment } from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DroppableDay } from "./droppable-day";
import { SortableActivity } from "./sortable-activity";
import { ActivityPlaceholderCard } from "./activity-placeholder-card";
import { useItineraryStore } from "../store";
import type { DayActivitiesListProps } from "../types";
import type { Activity } from "@/types/itinerary";
import { useTranslations } from "next-intl";

const TRANSPORT_ICON: Record<string, string> = {
  driving: "🚗",
  transit: "🚌",
  walking: "🚶",
  bicycling: "🚲",
};

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function TransitConnector({
  prev,
  next,
  transportMode,
}: {
  prev: Activity;
  next: Activity;
  transportMode?: string;
}) {
  const t = useTranslations("transit");
  const gap = toMinutes(next.time) - (toMinutes(prev.time) + prev.duration_minutes);
  if (gap <= 0) return null;

  const icon = TRANSPORT_ICON[transportMode ?? ""] ?? "🚌";

  return (
    <div className="flex items-center gap-2 px-4 py-1 text-xs text-muted-foreground select-none">
      <div className="flex-1 h-px bg-border" />
      <span>{icon} {t("about")} {gap} {t("minutes")}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

export function DayActivitiesList({
  day,
  draggingActivityId,
  crossDayDragInfo,
  onActivityHover,
}: DayActivitiesListProps) {
  const activities = day.activities;
  const transportMode = day.transport_mode;
  const itemIds = useMemo(
    () => activities.map((activity) => activity.id),
    [activities]
  );

  // Add mode state
  const isAddMode = useItineraryStore((s) => s.isAddingActivity);
  const addModePlaceholder = useItineraryStore((s) => s.addModePlaceholder);
  const setIsAddingActivity = useItineraryStore((s) => s.setIsAddingActivity);
  const setAddingActivityTarget = useItineraryStore((s) => s.setAddingActivityTarget);

  const placeholderIndex =
    isAddMode && addModePlaceholder?.dayNumber === day.day_number
      ? addModePlaceholder.insertionIndex
      : null;

  const handlePlaceholderClick = useCallback(() => {
    setAddingActivityTarget({
      dayNumber: day.day_number,
      insertionIndex: placeholderIndex ?? 0,
    });
    setIsAddingActivity(false);
  }, [day.day_number, placeholderIndex, setAddingActivityTarget, setIsAddingActivity]);

  // Empty day
  if (activities.length === 0) {
    const showPlaceholder = isAddMode && placeholderIndex !== null;
    return (
      <div data-day-list={day.day_number}>
        {showPlaceholder ? (
          <ActivityPlaceholderCard onClick={handlePlaceholderClick} />
        ) : (
          <DroppableDay
            dayNumber={day.day_number}
            isOver={
              draggingActivityId !== null &&
              crossDayDragInfo?.targetDayNumber === day.day_number
            }
          />
        )}
      </div>
    );
  }

  // Day with activities
  return (
    <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
      <div data-day-list={day.day_number} className="space-y-0">
        {day.activities.map((activity, i) => (
          <Fragment key={activity.id}>
            {isAddMode && placeholderIndex === i && (
              <ActivityPlaceholderCard onClick={handlePlaceholderClick} />
            )}
            {i > 0 && !draggingActivityId && (
              <TransitConnector
                prev={day.activities[i - 1]}
                next={activity}
                transportMode={transportMode}
              />
            )}
            <SortableActivity
              activity={activity}
              dayNumber={day.day_number}
              onActivityHover={onActivityHover}
              disableAnimation={
                crossDayDragInfo?.targetDayNumber === day.day_number
              }
            />
          </Fragment>
        ))}
        {isAddMode && placeholderIndex === activities.length && (
          <ActivityPlaceholderCard onClick={handlePlaceholderClick} />
        )}
      </div>
    </SortableContext>
  );
}
