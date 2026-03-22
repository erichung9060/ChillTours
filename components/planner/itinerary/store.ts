import { create } from "zustand";
import type { Itinerary, Activity, Day } from "@/types/itinerary";
import type { Active, Over } from "@dnd-kit/core";
import { calculateDragOverUpdate } from "./utils/drag-handlers";
import { loadItinerary, updateItinerary } from "@/lib/supabase/itineraries";
import { applyOperations, type OperationsUpdate } from "@/lib/ai/operations";
import { aiClient } from "@/lib/ai/client";
import { calcDayCount } from "@/lib/utils/date";
import { adjustDays } from "@/lib/utils/itinerary";
import { ensureLocationData } from "@/lib/maps/geocoding";

interface ItineraryState {
  // Data State
  itinerary: Itinerary | null;
  isLoading: boolean;
  error: string | null;

  // Generation State
  isGenerating: boolean;
  isSaving: boolean;
  generationAbortController: AbortController | null;
  pollingIntervalId: ReturnType<typeof setInterval> | null;

  // Interaction State
  crossDayDragInfo: { sourceDayNumber: number; targetDayNumber: number } | null;
  draggingActivityId: string | null;
  hoveredDayNumber: number | null;
  hoveredActivityId: string | null;

  // Add Activity Mode State
  isAddingActivity: boolean;
  addingActivityTarget: { dayNumber: number; insertionIndex: number } | null;
  addModePlaceholder: { dayNumber: number; insertionIndex: number } | null;

  // Data Actions
  fetchItinerary: (id: string) => Promise<void>;
  updateMetadata: (updates: Partial<Pick<Itinerary, "title" | "destination" | "start_date" | "end_date" | "preferences">>) => Promise<void>;
  addActivity: (dayNumber: number, activityInput: {
      title: string;
      locationName: string;
      time: string;
      duration: number;
      note?: string;
      url?: string;
  }, insertionIndex?: number) => Promise<void>;
  updateActivity: (activityId: string, activityInput: {
      title: string;
      locationName: string;
      time: string;
      duration: number;
      note?: string;
      url?: string;
  }) => Promise<void>;
  deleteActivity: (activityId: string) => Promise<void>;
  updateDays: (newDays: Day[]) => Promise<void>;

  // Generation Actions
  startStreaming: (itineraryId: string, locale: string) => Promise<void>;
  appendStreamedActivity: (dayNumber: number, activity: Activity) => void;
  completeGeneration: () => void;
  startPolling: (itineraryId: string) => void;
  stopPolling: () => void;
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

  // Add Activity Mode Actions
  setIsAddingActivity: (flag: boolean) => void;
  setAddingActivityTarget: (target: { dayNumber: number; insertionIndex: number } | null) => void;
  setAddModePlaceholder: (placeholder: { dayNumber: number; insertionIndex: number } | null) => void;
}

export const useItineraryStore = create<ItineraryState>((set, get) => ({
  // Initial State
  itinerary: null,
  isLoading: false,
  error: null,
  isGenerating: false,
  isSaving: false,
  generationAbortController: null,
  pollingIntervalId: null,
  crossDayDragInfo: null,
  draggingActivityId: null,
  hoveredDayNumber: null,
  hoveredActivityId: null,
  isAddingActivity: false,
  addingActivityTarget: null,
  addModePlaceholder: null,

  // Basic Setters
  setCrossDayDragInfo: (info) => set({ crossDayDragInfo: info }),
  setDraggingActivityId: (id) => set({ draggingActivityId: id }),
  setHoveredDay: (dayNumber) => set({ hoveredDayNumber: dayNumber }),
  setHoveredActivity: (activityId) => set({ hoveredActivityId: activityId }),
  setIsAddingActivity: (flag) =>
    set({
      isAddingActivity: flag,
      ...(flag ? {} : { addModePlaceholder: null }),
    }),
  setAddingActivityTarget: (target) => set({ addingActivityTarget: target }),
  setAddModePlaceholder: (placeholder) => set({ addModePlaceholder: placeholder }),

  // Fetch Action
  fetchItinerary: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await loadItinerary(id);
      set({ itinerary: data });
    } catch (err) {
      console.error("Failed to load itinerary:", err);
      set({ error: "Failed to load itinerary. Please try again." });
    } finally {
      set({ isLoading: false });
    }
  },

  // Update Metadata
  updateMetadata: async (updates) => {
    const state = get();
    const currentItinerary = state.itinerary;
    if (!currentItinerary) return;

    // Determine whether the trip length is changing
    const newStart = updates.start_date ?? currentItinerary.start_date;
    const newEnd = updates.end_date ?? currentItinerary.end_date;
    const oldDayCount = calcDayCount(currentItinerary.start_date, currentItinerary.end_date);
    const newDayCount = calcDayCount(newStart, newEnd);

    // Track dirty fields
    const dirtyPayload: Partial<Itinerary> = {};

    if (updates.title !== undefined && updates.title !== currentItinerary.title) {
      dirtyPayload.title = updates.title;
    }
    if (updates.destination !== undefined && updates.destination !== currentItinerary.destination) {
      dirtyPayload.destination = updates.destination;
    }
    if (updates.start_date !== undefined && updates.start_date !== currentItinerary.start_date) {
      dirtyPayload.start_date = updates.start_date;
    }
    if (updates.end_date !== undefined && updates.end_date !== currentItinerary.end_date) {
      dirtyPayload.end_date = updates.end_date;
    }
    if (updates.preferences !== undefined && updates.preferences !== currentItinerary.preferences) {
      dirtyPayload.preferences = updates.preferences;
    }

    let adjustedDays: Day[] | undefined;

    if (newDayCount !== oldDayCount) {
      adjustedDays = adjustDays(currentItinerary.days, newDayCount);
      dirtyPayload.days = adjustedDays;
    }

    // If nothing changed, do not send API request
    if (Object.keys(dirtyPayload).length === 0) {
      return;
    }

    set({ isSaving: true });

    try {
      const updated = await updateItinerary(currentItinerary.id, dirtyPayload);
      set({ itinerary: updated });
    } catch (err) {
      console.error("Failed to update itinerary metadata:", err);
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  // AI Operations Action
  applyOperations: async (ops: OperationsUpdate) => {
    const state = get();
    const currentItinerary = state.itinerary;
    if (!currentItinerary) return;

    // 1. 本地透過 AI operations 計算出預期的 itinerary 狀態
    const optimisticItinerary = await applyOperations(currentItinerary, ops);

    // 2. 樂觀更新 (Optimistic Update)：先更新 UI 讓使用者立刻看到 AI 改動結果
    set({ itinerary: optimisticItinerary, isSaving: true });

    try {
      // 3. 明確宣告 payload 傳給後端，獨立儲存 days
      const updated = await updateItinerary(currentItinerary.id, {
        days: optimisticItinerary.days,
      });

      // 4. Server Source of Truth: 用後端回傳的最終結果確保一致性
      set({ itinerary: updated });
    } catch (err) {
      console.error("Failed to apply AI operations:", err);
      // 5. 錯誤處理：如果儲存失敗，退回操作前的狀態 (Rollback)
      set({ itinerary: currentItinerary });
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  // Save specific days array (e.g. from Drag & Drop)
  updateDays: async (newDays: Day[]) => {
    const state = get();
    if (!state.itinerary || state.isGenerating) return;
    set({ isSaving: true });
    try {
      const updated = await updateItinerary(state.itinerary.id, { days: newDays });
      set({ itinerary: updated });
    } catch (err) {
      console.error("Failed to update itinerary days:", err);
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  // Add Single Activity
  addActivity: async (dayNumber, activityInput, insertionIndex?: number) => {
    const state = get();
    if (!state.itinerary) return;

    set({ isSaving: true });
    try {
      // Resolve location data
      const resolvedLocation = await ensureLocationData({
        name: activityInput.locationName,
      });

      // Create activity object
      const activity: Activity = {
        id: crypto.randomUUID(),
        title: activityInput.title,
        location: resolvedLocation,
        note: activityInput.note || "",
        time: activityInput.time,
        duration_minutes: activityInput.duration,
        url: activityInput.url || undefined,
        order: insertionIndex ?? 0,
      };

      const days = state.itinerary.days.map((day) =>
        day.day_number === dayNumber
          ? {
              ...day,
              activities:
                insertionIndex !== undefined &&
                insertionIndex >= 0 &&
                insertionIndex <= day.activities.length
                  ? [
                      ...day.activities.slice(0, insertionIndex),
                      activity,
                      ...day.activities.slice(insertionIndex),
                    ]
                  : [...day.activities, activity],
            }
          : day
      );

      const updated = await updateItinerary(state.itinerary.id, { days });
      set({ itinerary: updated });
      get().setHoveredActivity(activity.id);
    } catch (err) {
      console.error("Failed to add activity:", err);
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  // Update Single Activity
  updateActivity: async (activityId, activityInput) => {
    const state = get();
    if (!state.itinerary) return;

      let existingActivity: Activity | undefined;
      for (const day of state.itinerary.days) {
        existingActivity = day.activities.find((a) => a.id === activityId);
        if (existingActivity) break;
      }

      if (!existingActivity) {
        throw new Error("Activity not found");
      }

    const isDirty =
      activityInput.title !== existingActivity.title ||
      activityInput.locationName !== existingActivity.location.name ||
      (activityInput.note || "") !== (existingActivity.note || "") ||
      activityInput.time !== existingActivity.time ||
      activityInput.duration !== existingActivity.duration_minutes ||
      (activityInput.url || "") !== (existingActivity.url || "");

    if (!isDirty) return;

    set({ isSaving: true });
    try {
      let resolvedLocation = existingActivity.location;
      if (activityInput.locationName !== existingActivity.location.name) {
        resolvedLocation = await ensureLocationData({
          name: activityInput.locationName,
        });
      }

      // Create updated activity object
      const updatedActivity: Activity = {
        ...existingActivity,
        title: activityInput.title,
        location: resolvedLocation,
        note: activityInput.note || "",
        time: activityInput.time,
        duration_minutes: activityInput.duration,
        url: activityInput.url || undefined,
      };

      const newDays = state.itinerary.days.map((day) => ({
        ...day,
        activities: day.activities.map((activity) =>
          activity.id === activityId ? updatedActivity : activity
        ),
      }));

      const updated = await updateItinerary(state.itinerary.id, { days: newDays });
      set({ itinerary: updated });
      get().setHoveredActivity(activityId);
    } catch (err) {
      console.error("Failed to update activity:", err);
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  // Delete Single Activity
  deleteActivity: async (activityId) => {
    const state = get();
    if (!state.itinerary) return;

    set({ isSaving: true });
    try {
      const newDays = state.itinerary.days.map((day) => ({
        ...day,
        activities: day.activities.filter((activity) => activity.id !== activityId),
      }));

      const updated = await updateItinerary(state.itinerary.id, { days: newDays });
      set({ itinerary: updated });
    } catch (err) {
      console.error("Failed to delete activity:", err);
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  // Generation Actions
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
          get().appendStreamedActivity(data.day_number, data.activity);
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

  appendStreamedActivity: (dayNumber, activity) =>
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

    if (!over) {
      set({ crossDayDragInfo: null });
      return;
    }

    if (active.id === over.id) {
      // Item hovering over itself (common after cross-day insertion).
      // Preserve crossDayDragInfo so disableAnimation stays active on the
      // target day. Clearing it here would re-enable transitions and cause
      // dnd-kit's sortable strategy transforms to animate as a visible "swap".
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
