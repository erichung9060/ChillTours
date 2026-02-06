/**
 * Expandable View Component
 * 
 * Displays days in an accordion-style view with expandable/collapsible sections.
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DayActivitiesList } from '../components/day-activities-list';
import type { ExpandableViewProps } from '../types';

export function ExpandableView({
    itinerary,
    draggingActivityId,
    crossDayDragInfo,
    expandedDays,
    toggleDay,
    onDayHover,
    onActivityHover,
}: ExpandableViewProps) {
    const formatDayInfo = (date: string) => {
        const dayDate = new Date(date);
        const weekday = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
        const monthDay = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `${weekday}, ${monthDay}`;
    };

    return (
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
                                    draggingActivityId={draggingActivityId}
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
}
