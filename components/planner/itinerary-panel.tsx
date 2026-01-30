/**
 * Itinerary Panel Component
 * 
 * Displays the itinerary in multiple view modes:
 * - Expandable: Day-by-day with expandable sections (default)
 * - Single Day: One day at a time with navigation arrows
 * - Side-by-Side: All days in columns with fullscreen option
 * 
 * Features drag-and-drop reordering using dnd-kit:
 * - Entire activity cards are draggable
 * - Visual feedback during drag (elevated, semi-transparent)
 * - Reorder within same day or move between days
 * - Smooth animations for position changes
 * - Insert between activities anywhere
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 7.1, 7.2, 7.3, 7.4, 7.5
 */

'use client';

import { useState } from 'react';
import type { Itinerary } from '@/types/itinerary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type ViewMode = 'expandable' | 'single-day' | 'side-by-side';

// Droppable Empty Day Component
interface DroppableDayProps {
  dayNumber: number;
  isOver?: boolean;
}

function DroppableDay({ dayNumber, isOver }: DroppableDayProps) {
  const { setNodeRef } = useDroppable({
    id: `empty-day-${dayNumber}`,
    data: {
      dayNumber,
      isEmpty: true,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[120px] transition-all ${
        isOver ? 'bg-primary/5' : ''
        }`}
    />
  );
}

// Day Activities List Component - Handles both empty and populated days
interface DayActivitiesListProps {
  day: any;
  activeId: string | null;
  crossDayDragInfo: { sourceDayNumber: number; targetDayNumber: number } | null;
  onActivityHover?: (activityId: string | null) => void;
}

function DayActivitiesList({ day, activeId, crossDayDragInfo, onActivityHover }: DayActivitiesListProps) {
  if (day.activities.length === 0) {
    return (
      <DroppableDay
        dayNumber={day.day_number}
        isOver={activeId !== null && crossDayDragInfo?.targetDayNumber === day.day_number}
      />
    );
  }

  return (
    <SortableContext
      items={day.activities.map((a: any) => a.id)}
      strategy={verticalListSortingStrategy}
    >
      <div className="space-y-0">
        {day.activities.map((activity: any) => (
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

// Activity Card Component - Shared between SortableActivity and DragOverlay
interface ActivityCardProps {
  activity: any;
  className?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

function ActivityCard({ activity, className, onMouseEnter, onMouseLeave }: ActivityCardProps) {
  return (
    <Card
      className={className}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Time Badge */}
          <div className="flex-shrink-0 px-2 py-1 bg-primary/10 rounded text-xs font-medium text-primary">
            {activity.time}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm mb-2">
              {activity.title}
            </h4>

            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="truncate">{activity.location.name}</span>
            </div>

            {activity.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {activity.description}
              </p>
            )}

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>{activity.duration_minutes} min</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Sortable Activity Item Component
interface SortableActivityProps {
  activity: any;
  dayNumber: number;
  onActivityHover?: (activityId: string | null) => void;
  disableAnimation?: boolean;
}

function SortableActivity({ activity, dayNumber, onActivityHover, disableAnimation }: SortableActivityProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: activity.id,
    data: {
      activity,
      dayNumber,
    },
    transition: disableAnimation ? null : {
      duration: 200,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: disableAnimation ? 'none' : transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ActivityCard
        activity={activity}
        className={`mb-3 transition-all border-b-4 border-r-4 border-b-primary/40 border-r-primary/40 hover:border-b-primary hover:border-r-primary ${
          isDragging ? 'shadow-2xl cursor-grabbing' : 'hover:shadow-md cursor-grab'
        }`}
        onMouseEnter={() => onActivityHover?.(activity.id)}
        onMouseLeave={() => onActivityHover?.(null)}
      />
    </div>
  );
}

interface ItineraryPanelProps {
  itinerary: Itinerary;
  onUpdate: (itinerary: Itinerary) => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  onToggleChat?: () => void;
  isChatOpen?: boolean;
  viewMode?: 'expandable' | 'single-day' | 'side-by-side';
  onViewModeChange?: (mode: 'expandable' | 'single-day' | 'side-by-side') => void;
  onDayHover?: (dayNumber: number | null) => void;
  onActivityHover?: (activityId: string | null) => void;
  currentDayIndex: number;
  onCurrentDayChange: (dayIndex: number) => void;
}

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
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>('side-by-side');
  const viewMode = externalViewMode ?? internalViewMode;
  const setViewMode = onViewModeChange ?? setInternalViewMode;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(
    new Set(itinerary.days.map(d => d.day_number))
  );

  // Drag and drop state
  const [activeId, setActiveId] = useState<string | null>(null);
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
    // Notify parent component about fullscreen state change
    onFullscreenChange?.(newFullscreenState);
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setCrossDayDragInfo(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) {
      setCrossDayDragInfo(null);
      return;
    }

    // Get source and target information
    const activeData = active.data.current;
    const overData = over.data.current;

    if (!activeData) return;
    if (active.id === over.id) return;

    const sourceDayNumber = activeData.dayNumber;

    // Handle dropping on empty day
    if (overData?.isEmpty) {
      const targetDayNumber = overData.dayNumber;

      const newItinerary = { ...itinerary };
      const sourceDayIndex = newItinerary.days.findIndex(d => d.day_number === sourceDayNumber);
      const targetDayIndex = newItinerary.days.findIndex(d => d.day_number === targetDayNumber);

      if (sourceDayIndex === -1 || targetDayIndex === -1) return;

      const sourceDay = newItinerary.days[sourceDayIndex];
      const targetDay = newItinerary.days[targetDayIndex];

      // Find the activity being dragged
      const activeIndex = sourceDay.activities.findIndex(a => a.id === active.id);
      if (activeIndex === -1) return;

      // Cross-day: disable animation for target day
      setCrossDayDragInfo({
        sourceDayNumber,
        targetDayNumber,
      });

      // Remove from source day
      const [movedActivity] = sourceDay.activities.splice(activeIndex, 1);

      // Add to empty target day
      targetDay.activities = [movedActivity];
      movedActivity.order = 0;

      // Update order property for source day
      sourceDay.activities.forEach((activity, index) => {
        activity.order = index;
      });

      onUpdate(newItinerary);
      return;
    }

    if (!overData) return;

    const targetDayNumber = overData.dayNumber;

    const newItinerary = { ...itinerary };
    const sourceDayIndex = newItinerary.days.findIndex(d => d.day_number === sourceDayNumber);
    const targetDayIndex = newItinerary.days.findIndex(d => d.day_number === targetDayNumber);

    if (sourceDayIndex === -1 || targetDayIndex === -1) return;

    const sourceDay = newItinerary.days[sourceDayIndex];
    const targetDay = newItinerary.days[targetDayIndex];

    // Find the activity being dragged
    const activeIndex = sourceDay.activities.findIndex(a => a.id === active.id);
    if (activeIndex === -1) return;

    if (sourceDayNumber === targetDayNumber) {
      // Same day: enable animation
      setCrossDayDragInfo(null);

      const overIndex = sourceDay.activities.findIndex(a => a.id === over.id);
      if (overIndex === -1 || activeIndex === overIndex) return;

      // Create a new array with the reordered items
      const reorderedActivities = [...sourceDay.activities];
      const [movedActivity] = reorderedActivities.splice(activeIndex, 1);
      reorderedActivities.splice(overIndex, 0, movedActivity);

      // Update order property
      reorderedActivities.forEach((activity, index) => {
        activity.order = index;
      });

      sourceDay.activities = reorderedActivities;
      onUpdate(newItinerary);
    } else {
      // Cross-day: disable animation for target day
      setCrossDayDragInfo({
        sourceDayNumber,
        targetDayNumber,
      });

      // Remove from source day
      const [movedActivity] = sourceDay.activities.splice(activeIndex, 1);

      // Find insertion position in target day
      const overIndex = targetDay.activities.findIndex(a => a.id === over.id);
      if (overIndex !== -1) {
        targetDay.activities.splice(overIndex, 0, movedActivity);
      } else {
        targetDay.activities.push(movedActivity);
      }

      // Update order property for all activities in both days
      sourceDay.activities.forEach((activity, index) => {
        activity.order = index;
      });
      targetDay.activities.forEach((activity, index) => {
        activity.order = index;
      });

      onUpdate(newItinerary);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    setCrossDayDragInfo(null);
  };

  // Helper function to format day information
  const formatDayInfo = (date: string) => {
    const dayDate = new Date(date);
    const weekday = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
    const monthDay = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${weekday}, ${monthDay}`;
  };

  // Get the active activity for drag overlay
  const activeActivity = activeId
    ? itinerary.days
      .flatMap(day => day.activities.map(activity => ({ activity, dayNumber: day.day_number })))
      .find(({ activity }) => activity.id === activeId)
    : null;

  // Render expandable view (original view)
  const renderExpandableView = () => (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {itinerary.days.map((day) => {
        const isExpanded = expandedDays.has(day.day_number);
        const formattedDate = formatDayInfo(day.date);

        return (
          <Card
            key={day.day_number}
            className="overflow-hidden"
          >
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
                  <p className="text-xs text-muted-foreground mt-1">
                    {day.activities.length} {day.activities.length === 1 ? 'activity' : 'activities'}
                  </p>
                </div>
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
                  className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="p-4 pt-0">
                <DayActivitiesList
                  day={day}
                  activeId={activeId}
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

  // Render single day view with navigation
  const renderSingleDayView = () => {
    const day = itinerary.days[currentDayIndex];
    if (!day) return null;

    const formattedDate = formatDayInfo(day.date);

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navigation Controls */}
        <div
          className="flex-shrink-0 flex items-center justify-between p-4 border-b border-border bg-background"
        >
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
            <p className="text-sm text-muted-foreground">
              {formattedDate}
            </p>
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
            activeId={activeId}
            crossDayDragInfo={crossDayDragInfo}
            onActivityHover={onActivityHover}
          />
        </div>
      </div>
    );
  };

  // Render side-by-side view
  const renderSideBySideView = () => (
    <div className="flex-1 overflow-x-auto overflow-y-auto">
      <div className="flex gap-4 p-4 min-w-max">
        {itinerary.days.map((day) => {
          const formattedDate = formatDayInfo(day.date);

          return (
            <div
              key={day.day_number}
              className="w-80 flex-shrink-0"
            >
              <Card className="h-full flex flex-col">
                <CardHeader
                  className="p-4 border-b border-border"
                  onMouseEnter={() => onDayHover?.(day.day_number)}
                  onMouseLeave={() => onDayHover?.(null)}
                >
                  <CardTitle className="text-base font-semibold">
                    Day {day.day_number}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formattedDate}
                  </p>
                </CardHeader>
                <CardContent className="p-4 flex-1 overflow-y-auto">
                  <DayActivitiesList
                    day={day}
                    activeId={activeId}
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
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-xl font-semibold">{itinerary.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {itinerary.destination}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(itinerary.start_date).toLocaleDateString()} - {new Date(itinerary.end_date).toLocaleDateString()}
            </p>
          </div>

          {/* View Mode Controls */}
          <div className="flex items-center gap-2">
            {/* View Mode Selector */}
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === 'expandable' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('expandable')}
                className="h-8 px-3"
                title="Expandable View"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="3" y1="15" x2="21" y2="15" />
                </svg>
              </Button>
              <Button
                variant={viewMode === 'single-day' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('single-day')}
                className="h-8 px-3"
                title="Single Day View"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </Button>
              <Button
                variant={viewMode === 'side-by-side' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('side-by-side')}
                className="h-8 px-3"
                title="Side-by-Side View"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="7" height="18" rx="1" />
                  <rect x="14" y="3" width="7" height="18" rx="1" />
                </svg>
              </Button>
            </div>

            {/* Fullscreen Toggle - Always visible, hidden on mobile */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="hidden md:flex h-8 w-8 p-0"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
              )}
            </Button>
          </div>
        </div>

        {/* Content based on view mode */}
        {viewMode === 'expandable' && renderExpandableView()}
        {viewMode === 'single-day' && renderSingleDayView()}
        {viewMode === 'side-by-side' && renderSideBySideView()}

        {/* Chat Toggle Button - Fixed at bottom right corner, hidden on mobile */}
        {onToggleChat && (
          <button
            onClick={onToggleChat}
            className="hidden md:flex absolute bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 items-center justify-center"
            aria-label={isChatOpen ? "Close chat" : "Open chat"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        )}
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
