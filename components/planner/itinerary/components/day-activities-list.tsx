/**
 * Day Activities List Component
 * 
 * Renders a list of activities for a day, handling both empty and populated states.
 */

'use client';

import { useMemo } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DroppableDay } from './droppable-day';
import { SortableActivity } from './sortable-activity';
import type { DayActivitiesListProps } from '../types';

export function DayActivitiesList({
    day,
    draggingActivityId,
    crossDayDragInfo,
    onActivityHover
}: DayActivitiesListProps) {
    const activities = day.activities;
    const itemIds = useMemo(() => activities.map((activity) => activity.id), [activities]);

    if (activities.length === 0) {
        return (
            <DroppableDay
                dayNumber={day.day_number}
                isOver={draggingActivityId !== null && crossDayDragInfo?.targetDayNumber === day.day_number}
            />
        );
    }

    return (
        <SortableContext
            items={itemIds}
            strategy={verticalListSortingStrategy}
        >
            <div className="space-y-0">
                {day.activities.map((activity) => (
                    <SortableActivity
                        key={activity.id}
                        activity={activity}
                        dayNumber={day.day_number}
                        onActivityHover={onActivityHover}
                        disableAnimation={crossDayDragInfo?.targetDayNumber === day.day_number}
                    />
                ))}
            </div>
        </SortableContext>
    );
}
