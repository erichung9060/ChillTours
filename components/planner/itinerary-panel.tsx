/**
 * Itinerary Panel Component
 * 
 * Displays the itinerary in a day-by-day format with expandable sections.
 * Left panel in the three-panel layout.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

'use client';

import { useState } from 'react';
import type { Itinerary } from '@/types/itinerary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ItineraryPanelProps {
  itinerary: Itinerary;
  onUpdate: (itinerary: Itinerary) => void;
}

export function ItineraryPanel({ itinerary, onUpdate }: ItineraryPanelProps) {
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

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h1 className="text-xl font-semibold">{itinerary.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {itinerary.destination}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(itinerary.start_date).toLocaleDateString()} - {new Date(itinerary.end_date).toLocaleDateString()}
        </p>
      </div>

      {/* Days List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {itinerary.days.map((day) => {
          const isExpanded = expandedDays.has(day.day_number);
          const dayDate = new Date(day.date);
          const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
          const dateStr = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          return (
            <Card key={day.day_number} className="overflow-hidden">
              {/* Day Header - Clickable to expand/collapse */}
              <CardHeader
                className="cursor-pointer hover:bg-accent/50 transition-colors p-4"
                onClick={() => toggleDay(day.day_number)}
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

              {/* Activities List - Shown when expanded */}
              {isExpanded && (
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {day.activities.map((activity, index) => (
                      <div
                        key={activity.id}
                        className="p-4 hover:bg-accent/30 transition-colors cursor-pointer"
                      >
                        {/* Activity Time */}
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-16 text-sm font-medium text-muted-foreground">
                            {activity.time}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            {/* Activity Title */}
                            <h4 className="font-medium text-sm mb-1">
                              {activity.title}
                            </h4>
                            
                            {/* Location */}
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
                            
                            {/* Description */}
                            {activity.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {activity.description}
                              </p>
                            )}
                            
                            {/* Duration */}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
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
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
