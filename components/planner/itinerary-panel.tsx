/**
 * Itinerary Panel Component
 * 
 * Displays the itinerary in multiple view modes:
 * - Expandable: Day-by-day with expandable sections (default)
 * - Single Day: One day at a time with navigation arrows
 * - Side-by-Side: All days in columns with fullscreen option
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

'use client';

import { useState } from 'react';
import type { Itinerary } from '@/types/itinerary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type ViewMode = 'expandable' | 'single-day' | 'side-by-side';

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
  onActivityHover
}: ItineraryPanelProps) {
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>('side-by-side');
  const viewMode = externalViewMode ?? internalViewMode;
  const setViewMode = onViewModeChange ?? setInternalViewMode;
  
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(
    new Set(itinerary.days.map(d => d.day_number))
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
    setCurrentDayIndex(prev => Math.max(0, prev - 1));
  };

  const goToNextDay = () => {
    setCurrentDayIndex(prev => Math.min(itinerary.days.length - 1, prev + 1));
  };

  const toggleFullscreen = () => {
    const newFullscreenState = !isFullscreen;
    setIsFullscreen(newFullscreenState);
    // Notify parent component about fullscreen state change
    onFullscreenChange?.(newFullscreenState);
  };

  // Render activity item as a draggable card (shared across view modes)
  const renderActivity = (activity: any, dayNumber: number) => (
    <Card
      key={activity.id}
      className="mb-3 hover:shadow-md transition-all cursor-move border-b-4 border-r-4 border-b-primary/40 border-r-primary/40 hover:border-b-primary hover:border-r-primary"
      onMouseEnter={() => onActivityHover?.(activity.id)}
      onMouseLeave={() => onActivityHover?.(null)}
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

  // Render expandable view (original view)
  const renderExpandableView = () => (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {itinerary.days.map((day) => {
        const isExpanded = expandedDays.has(day.day_number);
        const dayDate = new Date(day.date);
        const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
        const dateStr = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

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
                    {dayName}, {dateStr}
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
                <div className="space-y-0">
                  {day.activities.map(activity => renderActivity(activity, day.day_number))}
                </div>
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

    const dayDate = new Date(day.date);
    const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return (
      <div className="flex-1 flex flex-col">
        {/* Navigation Controls */}
        <div 
          className="flex items-center justify-between p-4 border-b border-border"
          onMouseEnter={() => onDayHover?.(day.day_number)}
          onMouseLeave={() => onDayHover?.(null)}
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
              {dayName}, {dateStr}
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
          <div className="space-y-0">
            {day.activities.map(activity => renderActivity(activity, day.day_number))}
          </div>
        </div>
      </div>
    );
  };

  // Render side-by-side view
  const renderSideBySideView = () => (
    <div className="flex-1 overflow-x-auto overflow-y-auto">
      <div className="flex gap-4 p-4 min-w-max">
        {itinerary.days.map((day) => {
          const dayDate = new Date(day.date);
          const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
          const dateStr = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

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
                    {dayName}, {dateStr}
                  </p>
                </CardHeader>
                <CardContent className="p-4 flex-1 overflow-y-auto">
                  <div className="space-y-0">
                    {day.activities.map(activity => renderActivity(activity, day.day_number))}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
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
  );
}
