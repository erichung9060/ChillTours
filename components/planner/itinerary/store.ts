import { create } from "zustand";
import type { Itinerary, Activity } from "@/types/itinerary";
import type { Active, Over } from "@dnd-kit/core";
import { calculateDragOverUpdate } from "./utils/drag-handlers";
import { loadItinerary, updateItinerary } from "@/lib/supabase/itineraries";
import { applyOperations, type OperationsUpdate } from "@/lib/ai/operations";
import { aiClient } from "@/lib/ai/client";

interface ItineraryState {
  // Data State
  itinerary: Itinerary | null;
  isLoading: boolean;
  error: string | null;

  // Generation State
  isGenerating: boolean;
  generationAbortController: AbortController | null;
  pollingIntervalId: ReturnType<typeof setInterval> | null;

  // Interaction State
  crossDayDragInfo: { sourceDayNumber: number; targetDayNumber: number } | null;
  draggingActivityId: string | null;
  hoveredDayNumber: number | null;
  hoveredActivityId: string | null;

  // Actions
  setItinerary: (itinerary: Itinerary) => void;
  updateActivity: (updatedActivity: Activity) => void;

  // Generation Actions
  startStreaming: (itineraryId: string, locale: string) => Promise<void>;
  addActivity: (dayNumber: number, activity: Activity) => void;
  completeGeneration: () => void;
  startPolling: (itineraryId: string) => void;
  stopPolling: () => void;

  // Lifecycle Actions
  fetchItinerary: (id: string) => Promise<void>;
  updateMetadata: (updates: Partial<Pick<Itinerary, "title" | "destination" | "start_date" | "end_date" | "requirements">>) => Promise<void>;
  applyOperations: (ops: OperationsUpdate) => Promise<void>;

  // Drag & Drop Actions
  handleDragOver: (
    active: Active,
    over: Over | null,
    activeData: any,
    overData: any
  ) => void;
  setCrossDayDragInfo: (
    info: { sourceDayNumber: number; targetDayNumber: number } | null
  ) => void;
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
  isGenerating: false,
  generationAbortController: null,
  pollingIntervalId: null,
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
      console.error("Failed to load itinerary:", err);
      set({
        error: "Failed to load itinerary. Please try again.",
        isLoading: false,
      });
    }
  },

  // Update Metadata
  updateMetadata: async (updates) => {
    const currentItinerary = get().itinerary;
    if (!currentItinerary) return;

    try {
      const updated = await updateItinerary(currentItinerary.id, updates);
      set({ itinerary: updated });
    } catch (err) {
      console.error("Failed to update itinerary metadata:", err);
      throw err;
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

  // Generation Actions
  addActivity: (dayNumber, activity) =>
    set((state) => {
      if (!state.itinerary) return state;

      const days = [...state.itinerary.days];
      const existingDayIdx = days.findIndex((d) => d.day_number === dayNumber);

      if (existingDayIdx !== -1) {
        // Day already exists, add activity to it
        days[existingDayIdx] = {
          ...days[existingDayIdx],
          activities: [...days[existingDayIdx].activities, activity],
        };
      } else {
        // Day doesn't exist, create new day
        days.push({ day_number: dayNumber, activities: [activity] });
        days.sort((a, b) => a.day_number - b.day_number);
      }

      return {
        itinerary: {
          ...state.itinerary,
          days,
          updated_at: new Date().toISOString(),
        },
      };
    }),

  completeGeneration: () =>
    set({ isGenerating: false, generationAbortController: null }),

  startStreaming: async (itineraryId, locale) => {
    const state = get();

    // Concurrency guard: abort any in-flight stream (handles React StrictMode double-invoke)
    if (state.generationAbortController) {
      state.generationAbortController.abort();
    }

    const controller = new AbortController();
    set({ isGenerating: true, generationAbortController: controller });

    try {
      await aiClient.streamItinerary(
        itineraryId,
        locale,
        // onActivity
        (data) => {
          get().addActivity(data.day_number, data.activity);
        },
        // onComplete
        () => {
          get().completeGeneration();
        },
        // onError
        (data) => {
          console.error("Generation error from server:", data.message);
          set({ isGenerating: false, error: data.message, generationAbortController: null });
        },
        controller.signal
      );
    } catch (err) {
      // AbortError is expected on cleanup — not a real error
      if (err instanceof Error && err.name === "AbortError") return;
      if (err instanceof Error && err.message === "ALREADY_GENERATING") {
        // 發現已經在生成中，平滑切換到 Polling 模式
        get().startPolling(itineraryId);
        return;
      }
      console.error("Stream failed:", err);
      set({
        isGenerating: false,
        error: "Generation failed. Please try again.",
        generationAbortController: null,
      });
    }
  },

  startPolling: (itineraryId) => {
    const existing = get().pollingIntervalId;
    if (existing) clearInterval(existing);

    set({ isGenerating: true });

    let attempts = 0;
    const MAX_ATTEMPTS = 100; // ~5 minutes at 3s interval

    const intervalId = setInterval(async () => {
      attempts++;

      if (attempts > MAX_ATTEMPTS) {
        get().stopPolling();
        set({ error: "Generation timed out. Please try again." });
        return;
      }

      try {
        const data = await loadItinerary(itineraryId);
        if (data.status === "completed") {
          get().stopPolling();
          set({ itinerary: data, isGenerating: false });
        } else if (data.status === "failed") {
          get().stopPolling();
          set({ isGenerating: false, error: "Generation failed. Please try again." });
        }
        // status === "generating" → keep polling
      } catch (err) {
        console.error("Polling error:", err);
        // Transient errors: keep polling
      }
    }, 3000);

    set({ pollingIntervalId: intervalId });
  },

  stopPolling: () => {
    const { pollingIntervalId } = get();
    if (pollingIntervalId) clearInterval(pollingIntervalId);
    set({ pollingIntervalId: null, isGenerating: false });
  },

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
          updated_at: new Date().toISOString(),
        },
        crossDayDragInfo: result.crossDayInfo,
      });
    }
  },
}));
