/**
 * Activity Card Component
 * 
 * Displays activity information including time, location, description, and duration.
 */

'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { ActivityCardProps } from '../types';

export function ActivityCard({
    activity,
    className,
    onMouseEnter,
    onMouseLeave
}: ActivityCardProps) {
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
