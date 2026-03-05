/**
 * Itinerary Panel Component
 *
 * Main orchestrator component for displaying and managing the itinerary.
 * Provides drag-and-drop functionality and multiple view modes.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 7.1, 7.2, 7.3, 7.4, 7.5
 */

"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  ActivityCard,
  PanelHeader,
  ChatToggleButton,
  ExpandableView,
  SingleDayView,
  SideBySideView,
} from "./itinerary";
import type { ItineraryPanelProps, ViewMode } from "./itinerary";
import type { Activity } from "@/types/itinerary";
import { useItineraryStore } from "./itinerary/store";

export function ItineraryPanel({
  onFullscreenChange,
  onToggleChat,
  isChatOpen,
  viewMode: externalViewMode,
  onViewModeChange,
  currentDayIndex,
  onCurrentDayChange,
}: ItineraryPanelProps) {
  // Store state - Read itinerary directly from store
  const itinerary = useItineraryStore((state) => state.itinerary);
  const saveItineraryDays = useItineraryStore(
    (state) => state.saveItineraryDays
  );
  const draggingActivityId = useItineraryStore(
    (state) => state.draggingActivityId
  );
  const crossDayDragInfo = useItineraryStore((state) => state.crossDayDragInfo);
  const setDraggingActivityId = useItineraryStore(
    (state) => state.setDraggingActivityId
  );
  const setCrossDayDragInfo = useItineraryStore(
    (state) => state.setCrossDayDragInfo
  );
  const handleDragOverAction = useItineraryStore(
    (state) => state.handleDragOver
  );
  const setHoveredDay = useItineraryStore((state) => state.setHoveredDay);
  const setHoveredActivity = useItineraryStore(
    (state) => state.setHoveredActivity
  );

  // Early return if no itinerary loaded
  if (!itinerary) {
    return null;
  }

  // View mode state
  const [internalViewMode, setInternalViewMode] =
    useState<ViewMode>("side-by-side");
  const viewMode = externalViewMode ?? internalViewMode;
  const setViewMode = onViewModeChange ?? setInternalViewMode;

  // UI state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(
    new Set(itinerary.days.map((day) => day.day_number))
  );

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    })
  );

  // UI handlers
  const toggleDay = (dayNumber: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayNumber)) {
        next.delete(dayNumber);
      } else {
        next.add(dayNumber);
      }
      return next;
    });
  };

  const goToPreviousDay = () => {
    const newIndex = Math.max(0, currentDayIndex - 1);
    onCurrentDayChange(newIndex);
  };

  const goToNextDay = () => {
    const newIndex = Math.min(itinerary.days.length - 1, currentDayIndex + 1);
    onCurrentDayChange(newIndex);
  };

  const toggleFullscreen = () => {
    const newFullscreenState = !isFullscreen;
    setIsFullscreen(newFullscreenState);
    onFullscreenChange?.(newFullscreenState);
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setDraggingActivityId(event.active.id as string);
    setCrossDayDragInfo(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    const activeData = active.data.current;
    const overData = over?.data.current;

    handleDragOverAction(active, over, activeData, overData);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingActivityId(null);
    setCrossDayDragInfo(null);
    saveItineraryDays();
  };

  // Get the active activity for drag overlay
  const activeActivity = draggingActivityId
    ? itinerary.days
      .flatMap((day) =>
        day.activities.map((activity) => ({
          activity,
          dayNumber: day.day_number,
        }))
      )
      .find(({ activity }) => activity.id === draggingActivityId)
    : null;

  // View renderers mapping
  const viewRenderers: Record<ViewMode, () => React.ReactElement | null> = {
    expandable: () => (
      <ExpandableView
        itinerary={itinerary}
        draggingActivityId={draggingActivityId}
        crossDayDragInfo={crossDayDragInfo}
        expandedDays={expandedDays}
        toggleDay={toggleDay}
        onDayHover={setHoveredDay}
        onActivityHover={setHoveredActivity}
      />
    ),
    "single-day": () => (
      <SingleDayView
        itinerary={itinerary}
        currentDayIndex={currentDayIndex}
        draggingActivityId={draggingActivityId}
        crossDayDragInfo={crossDayDragInfo}
        goToPreviousDay={goToPreviousDay}
        goToNextDay={goToNextDay}
        onActivityHover={setHoveredActivity}
      />
    ),
    "side-by-side": () => (
      <SideBySideView
        itinerary={itinerary}
        draggingActivityId={draggingActivityId}
        crossDayDragInfo={crossDayDragInfo}
        onDayHover={setHoveredDay}
        onActivityHover={setHoveredActivity}
      />
    ),
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        <PanelHeader
          itinerary={itinerary}
          viewMode={viewMode}
          setViewMode={setViewMode}
          isFullscreen={isFullscreen}
          toggleFullscreen={toggleFullscreen}
        />

        {/* Content based on view mode */}
        {viewRenderers[viewMode]()}

        {/* Chat Toggle Button */}
        <ChatToggleButton onToggleChat={onToggleChat} isChatOpen={isChatOpen} />
      </div>

      {/* Drag Overlay - Shows the dragged item following the cursor */}
      <DragOverlay>
        {activeActivity && (
          <ActivityCard
            activity={activeActivity.activity}
            className="shadow-2xl border-b-4 border-r-4 border-b-primary border-r-primary opacity-90"
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
