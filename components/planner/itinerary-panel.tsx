/**
 * Itinerary Panel Component
 * 
 * Main orchestrator component for displaying and managing the itinerary.
 * Provides drag-and-drop functionality and multiple view modes.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 7.1, 7.2, 7.3, 7.4, 7.5
 */

'use client';

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import {
  ActivityCard,
  PanelHeader,
  ChatToggleButton,
  ExpandableView,
  SingleDayView,
  SideBySideView,
  calculateDragOverUpdate,
} from './itinerary';
import type { ItineraryPanelProps, ViewMode } from './itinerary';

export function ItineraryPanel({
  itinerary,
  onUpdate,
  onFullscreenChange,
  onToggleChat,
  isChatOpen,
  viewMode: externalViewMode,
  onViewModeChange,
  onDayHover,
  onActivityHover,
  currentDayIndex,
  onCurrentDayChange,
}: ItineraryPanelProps) {
  // View mode state
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>('side-by-side');
  const viewMode = externalViewMode ?? internalViewMode;
  const setViewMode = onViewModeChange ?? setInternalViewMode;

  // UI state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(
    new Set(itinerary.days.map(day => day.day_number))
  );

  // Drag and drop state
  const [draggingActivityId, setDraggingActivityId] = useState<string | null>(null);
  const [crossDayDragInfo, setCrossDayDragInfo] = useState<{
    sourceDayNumber: number;
    targetDayNumber: number;
  } | null>(null);

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // UI handlers
  const toggleDay = (dayNumber: number) => {
    setExpandedDays(prev => {
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

    if (!over) {
      setCrossDayDragInfo(null);
      return;
    }

    const activeData = active.data.current;
    const overData = over.data.current;

    if (!activeData || !overData) return;
    if (active.id === over.id) return;

    const result = calculateDragOverUpdate(
      active,
      over,
      activeData,
      overData,
      itinerary
    );

    if (result) {
      setCrossDayDragInfo(result.crossDayInfo);
      onUpdate(result.newItinerary);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingActivityId(null);
    setCrossDayDragInfo(null);
  };

  // Get the active activity for drag overlay
  const activeActivity = draggingActivityId
    ? itinerary.days
      .flatMap(day => day.activities.map(activity => ({ activity, dayNumber: day.day_number })))
      .find(({ activity }) => activity.id === draggingActivityId)
    : null;

  // View renderers mapping
  const viewRenderers: Record<ViewMode, () => React.ReactElement | null> = {
    'expandable': () => (
      <ExpandableView
        itinerary={itinerary}
        draggingActivityId={draggingActivityId}
        crossDayDragInfo={crossDayDragInfo}
        expandedDays={expandedDays}
        toggleDay={toggleDay}
        onDayHover={onDayHover}
        onActivityHover={onActivityHover}
      />
    ),
    'single-day': () => (
      <SingleDayView
        itinerary={itinerary}
        currentDayIndex={currentDayIndex}
        draggingActivityId={draggingActivityId}
        crossDayDragInfo={crossDayDragInfo}
        goToPreviousDay={goToPreviousDay}
        goToNextDay={goToNextDay}
        onActivityHover={onActivityHover}
      />
    ),
    'side-by-side': () => (
      <SideBySideView
        itinerary={itinerary}
        draggingActivityId={draggingActivityId}
        crossDayDragInfo={crossDayDragInfo}
        onDayHover={onDayHover}
        onActivityHover={onActivityHover}
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
