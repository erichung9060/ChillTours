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
import { useItineraryPermission } from "@/hooks/use-itinerary-permission";
import type { DayActivitiesListProps } from "../types";

export function DayActivitiesList({
  day,
  draggingActivityId,
  crossDayDragInfo,
  onActivityHover,
}: DayActivitiesListProps) {
  const { canEdit } = useItineraryPermission();
  const activities = day.activities;
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
    canEdit && isAddMode && addModePlaceholder?.dayNumber === day.day_number
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
    const showPlaceholder = canEdit && isAddMode && placeholderIndex !== null;
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
            {canEdit && isAddMode && placeholderIndex === i && (
              <ActivityPlaceholderCard onClick={handlePlaceholderClick} />
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
        {canEdit && isAddMode && placeholderIndex === activities.length && (
          <ActivityPlaceholderCard onClick={handlePlaceholderClick} />
        )}
      </div>
    </SortableContext>
  );
}
