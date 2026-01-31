/**
 * Droppable Day Component
 * 
 * Renders a drop zone for empty days to accept dragged activities.
 */

'use client';

import { useDroppable } from '@dnd-kit/core';
import type { DroppableDayProps } from '../types';

export function DroppableDay({ dayNumber, isOver }: DroppableDayProps) {
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
            className={`min-h-[120px] transition-all ${isOver ? 'bg-primary/5' : ''
                }`}
        />
    );
}
