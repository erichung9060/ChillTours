import { create } from 'zustand';
import type { Itinerary, Activity } from '@/types/itinerary';
import type { Active, Over } from '@dnd-kit/core';
import { calculateDragOverUpdate } from './utils/drag-handlers';
import { loadItinerary } from './services/mock-itinerary';
import { applyOperations, type OperationsUpdate } from '@/lib/ai/operations';

interface ItineraryState {
    // Data State
    itinerary: Itinerary | null;
    isLoading: boolean;
    error: string | null;

    // Interaction State
    crossDayDragInfo: { sourceDayNumber: number; targetDayNumber: number } | null;
    draggingActivityId: string | null;
    hoveredDayNumber: number | null;
    hoveredActivityId: string | null;

    // Actions
    setItinerary: (itinerary: Itinerary) => void;
    updateActivity: (updatedActivity: Activity) => void;

    // Lifecycle Actions
    fetchItinerary: (id: string) => Promise<void>;
    applyOperations: (ops: OperationsUpdate) => Promise<void>;

    // Drag & Drop Actions
    handleDragOver: (active: Active, over: Over | null, activeData: any, overData: any) => void;
    setCrossDayDragInfo: (info: { sourceDayNumber: number; targetDayNumber: number } | null) => void;
    setDraggingActivityId: (id: string | null) => void;

    // Hover State Actions
    setHoveredDay: (dayNumber: number | null) => void;
    setHoveredActivity: (activityId: string | null) => void;
}

export const useItineraryStore = create<ItineraryState>((set, get) => ({
    // Initial State
    itinerary: null,
    isLoading: false,
    error: null,
    crossDayDragInfo: null,
    draggingActivityId: null,
    hoveredDayNumber: null,
    hoveredActivityId: null,

    // Basic Setters
    setItinerary: (itinerary) => set({ itinerary }),
    setCrossDayDragInfo: (info) => set({ crossDayDragInfo: info }),
    setDraggingActivityId: (id) => set({ draggingActivityId: id }),
    setHoveredDay: (dayNumber) => set({ hoveredDayNumber: dayNumber }),
    setHoveredActivity: (activityId) => set({ hoveredActivityId: activityId }),

    // Fetch Action
    fetchItinerary: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
            const data = await loadItinerary(id);
            set({ itinerary: data, isLoading: false });
        } catch (err) {
            console.error('Failed to load itinerary:', err);
            set({
                error: 'Failed to load itinerary. Please try again.',
                isLoading: false
            });
        }
    },

    // AI Operations Action
    applyOperations: async (ops: OperationsUpdate) => {
        const currentItinerary = get().itinerary;
        if (!currentItinerary) return;

        const updated = await applyOperations(currentItinerary, ops);
        set({ itinerary: updated });
    },

    // Update Single Activity
    updateActivity: (updatedActivity) =>
        set((state) => {
            if (!state.itinerary) return state;

            const newDays = state.itinerary.days.map((day) => ({
                ...day,
                activities: day.activities.map((activity) =>
                    activity.id === updatedActivity.id ? updatedActivity : activity
                ),
            }));

            return {
                itinerary: {
                    ...state.itinerary,
                    days: newDays,
                    updated_at: new Date().toISOString(),
                },
            };
        }),

    // Drag & Drop Logic
    handleDragOver: (active, over, activeData, overData) => {
        const state = get();
        if (!state.itinerary) return;

        if (!over || active.id === over.id) {
            set({ crossDayDragInfo: null });
            return;
        }

        const result = calculateDragOverUpdate(
            active,
            over,
            activeData,
            overData,
            state.itinerary
        );

        if (result) {
            set({
                itinerary: {
                    ...result.newItinerary,
                    updated_at: new Date().toISOString()
                },
                crossDayDragInfo: result.crossDayInfo
            });
        }
    }
}));
