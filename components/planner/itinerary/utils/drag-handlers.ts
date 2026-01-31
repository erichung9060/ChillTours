/**
 * Drag and Drop Handlers
 * 
 * Pure functions for handling drag-and-drop logic.
 * These functions calculate the new itinerary state when activities are dragged and dropped.
 */

import type { Active, Over } from '@dnd-kit/core';
import type { Itinerary, Day } from '@/types/itinerary';

/**
 * Helper to clone a day and its activities array for immutable updates
 */
const cloneDayInItinerary = (
    newItinerary: Itinerary,
    dayIndex: number
): Day => {
    newItinerary.days[dayIndex] = {
        ...newItinerary.days[dayIndex],
        activities: [...newItinerary.days[dayIndex].activities],
    };
    return newItinerary.days[dayIndex];
};

/**
 * Handle dropping an activity on an empty day
 */
export const handleEmptyDayDrop = (
    draggingActivityId: string,
    overData: any,
    newItinerary: Itinerary,
    sourceDayNumber: number,
    cloneDay: (index: number) => Day
) => {
    const targetDayNumber = overData.dayNumber;
    const sourceDayIndex = newItinerary.days.findIndex(d => d.day_number === sourceDayNumber);
    const targetDayIndex = newItinerary.days.findIndex(d => d.day_number === targetDayNumber);

    if (sourceDayIndex === -1 || targetDayIndex === -1) return null;

    const sourceDay = cloneDay(sourceDayIndex);
    const targetDay = cloneDay(targetDayIndex);

    const activeIndex = sourceDay.activities.findIndex(a => a.id === draggingActivityId);
    if (activeIndex === -1) return null;

    const crossDayInfo = { sourceDayNumber, targetDayNumber };
    const [movedActivity] = sourceDay.activities.splice(activeIndex, 1);
    targetDay.activities = [movedActivity];
    movedActivity.order = 0;

    sourceDay.activities.forEach((activity, activityIndex) => { activity.order = activityIndex; });

    return { newItinerary, crossDayInfo };
};

/**
 * Handle dragging within the same day (reordering)
 */
export const handleSameDayDrag = (
    draggingActivityId: string,
    overId: string,
    newItinerary: Itinerary,
    sourceDayNumber: number,
    cloneDay: (index: number) => Day
) => {
    const sourceDayIndex = newItinerary.days.findIndex(d => d.day_number === sourceDayNumber);
    if (sourceDayIndex === -1) return null;

    const sourceDay = cloneDay(sourceDayIndex);
    const activeIndex = sourceDay.activities.findIndex(a => a.id === draggingActivityId);
    const overIndex = sourceDay.activities.findIndex(a => a.id === overId);

    if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) return null;

    const [movedActivity] = sourceDay.activities.splice(activeIndex, 1);
    sourceDay.activities.splice(overIndex, 0, movedActivity);

    sourceDay.activities.forEach((activity, activityIndex) => { activity.order = activityIndex; });

    return { newItinerary, crossDayInfo: null };
};

/**
 * Handle dragging between different days
 */
export const handleCrossDayDrag = (
    active: Active,
    over: Over,
    newItinerary: Itinerary,
    sourceDayNumber: number,
    targetDayNumber: number,
    cloneDay: (index: number) => Day
) => {
    const draggingActivityId = active.id as string;
    const overId = over.id as string;

    const sourceDayIndex = newItinerary.days.findIndex(d => d.day_number === sourceDayNumber);
    const targetDayIndex = newItinerary.days.findIndex(d => d.day_number === targetDayNumber);

    if (sourceDayIndex === -1 || targetDayIndex === -1) return null;

    const sourceDay = cloneDay(sourceDayIndex);
    const targetDay = cloneDay(targetDayIndex);

    const activeIndex = sourceDay.activities.findIndex(a => a.id === draggingActivityId);
    if (activeIndex === -1) return null;

    const crossDayInfo = { sourceDayNumber, targetDayNumber };
    const [movedActivity] = sourceDay.activities.splice(activeIndex, 1);

    const overIndex = targetDay.activities.findIndex(a => a.id === overId);

    if (overIndex !== -1) {
        let newIndex = overIndex;

        const isBelowOverItem =
            over &&
            active.rect.current.translated &&
            active.rect.current.translated.top >
            over.rect.top + over.rect.height;

        const modifier = isBelowOverItem ? 1 : 0;

        newIndex = overIndex >= 0 ? overIndex + modifier : targetDay.activities.length + 1;

        targetDay.activities.splice(newIndex, 0, movedActivity);
    } else {
        targetDay.activities.push(movedActivity);
    }

    sourceDay.activities.forEach((activity, activityIndex) => { activity.order = activityIndex; });
    targetDay.activities.forEach((activity, activityIndex) => { activity.order = activityIndex; });

    return { newItinerary, crossDayInfo };
};

/**
 * Calculate the new itinerary state during drag over
 * This is the main orchestrator function that delegates to specific handlers
 */
export const calculateDragOverUpdate = (
    active: Active,
    over: Over,
    activeData: any,
    overData: any,
    itinerary: Itinerary
): { newItinerary: Itinerary; crossDayInfo: { sourceDayNumber: number; targetDayNumber: number } | null } | null => {
    const draggingActivityId = active.id as string;
    const overId = over.id as string;
    const sourceDayNumber = activeData.dayNumber;
    const newItinerary = { ...itinerary };
    newItinerary.days = [...newItinerary.days];

    const cloneDay = (dayIndex: number) => cloneDayInItinerary(newItinerary, dayIndex);

    // Handle dropping on empty day
    if (overData?.isEmpty) {
        return handleEmptyDayDrop(draggingActivityId, overData, newItinerary, sourceDayNumber, cloneDay);
    }

    if (!overData) return null;

    const targetDayNumber = overData.dayNumber;

    // Handle same-day reordering
    if (sourceDayNumber === targetDayNumber) {
        return handleSameDayDrag(draggingActivityId, overId, newItinerary, sourceDayNumber, cloneDay);
    } else {
        // Handle cross-day drag
        return handleCrossDayDrag(
            active,
            over,
            newItinerary,
            sourceDayNumber,
            targetDayNumber,
            cloneDay
        );
    }
};
