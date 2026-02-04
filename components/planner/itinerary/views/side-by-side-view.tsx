/**
 * Side-by-Side View Component
 * 
 * Displays all days in horizontal columns.
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DayActivitiesList } from '../components/day-activities-list';
import type { SideBySideViewProps } from '../types';

export function SideBySideView({
    itinerary,
    draggingActivityId,
    crossDayDragInfo,
    onDayHover,
    onActivityHover,
    onActivityUpdate,
}: SideBySideViewProps) {
    const formatDayInfo = (date: string) => {
        const dayDate = new Date(date);
        const weekday = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
        const monthDay = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `${weekday}, ${monthDay}`;
    };

    return (
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
                                        draggingActivityId={draggingActivityId}
                                        crossDayDragInfo={crossDayDragInfo}
                                        onActivityHover={onActivityHover}
                                        onActivityUpdate={onActivityUpdate}
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
