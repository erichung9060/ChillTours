import { create } from "zustand";
import type { Itinerary, Activity, Day } from "@/types/itinerary";
import type { EffectivePermission } from "@/types/share";
import type { Active, Over } from "@dnd-kit/core";
import { calculateDragOverUpdate } from "./utils/drag-handlers";
import { loadItinerary, updateItinerary } from "@/lib/supabase/itineraries";
import { getEffectivePermission } from "@/lib/supabase/shares";
import { applyOperations, type OperationsUpdate } from "@/lib/ai/operations";
import { aiClient } from "@/lib/ai/client";
import { calcDayCount } from "@/lib/utils/date";
import { adjustDays } from "@/lib/utils/itinerary";
import { resolvePlaceDetails } from "@/lib/places/place-resolver";

const MAX_HISTORY_ENTRIES = 50;

interface ItineraryState {
  // Data State
  itinerary: Itinerary | null;
  isLoading: boolean;
  error: string | null;
  historyPast: Itinerary[];
  historyFuture: Itinerary[];
  permission: EffectivePermission;

  // Generation State
  isGenerating: boolean;
  isSaving: boolean;
  generationAbortController: AbortController | null;
  pollingIntervalId: ReturnType<typeof setInterval> | null;

  // Interaction State
  previewBaseItinerary: Itinerary | null;
  previewItinerary: Itinerary | null;

  crossDayDragInfo: { sourceDayNumber: number; targetDayNumber: number } | null;
  draggingActivityId: string | null;

  hoveredDayNumber: number | null;
  hoveredActivityId: string | null;
  focusedActivityId: string | null;

  // Add Activity Mode State
  isAddingActivity: boolean;
  addingActivityTarget: { dayNumber: number; insertionIndex: number } | null;
  addModePlaceholder: { dayNumber: number; insertionIndex: number } | null;

  // Data Actions
  fetchItinerary: (id: string) => Promise<void>;
  commitItineraryChange: (nextItinerary: Itinerary) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canEdit: () => boolean;
  canDelete: () => boolean;
  canShare: () => boolean;
  getCanUndo: () => boolean;
  getCanRedo: () => boolean;
  startPreview: (baseItinerary?: Itinerary) => void;
  updatePreview: (nextItinerary: Itinerary) => void;
  applyPreview: () => Promise<void>;
  discardPreview: () => void;
  resetDragState: () => void;
  updateMetadata: (updates: Partial<Pick<Itinerary, "title" | "destination" | "start_date" | "end_date" | "preferences">>) => Promise<void>;
  addActivity: (dayNumber: number, activityInput: {
      title: string;
      locationName: string;
      time: string;
      duration: number;
      note?: string;
  }, insertionIndex?: number) => Promise<void>;
  updateActivity: (activityId: string, activityInput: {
      title: string;
      locationName: string;
      time: string;
      duration: number;
      note?: string;
  }) => Promise<void>;
  deleteActivity: (activityId: string) => Promise<void>;

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

  // Hover & Focus State Actions
  setHoveredDay: (dayNumber: number | null) => void;
  setHoveredActivity: (activityId: string | null) => void;
  setFocusedActivity: (activityId: string | null) => void;

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
  historyPast: [],
  historyFuture: [],
  permission: "none" as EffectivePermission,
  isGenerating: false,
  isSaving: false,
  generationAbortController: null,
  pollingIntervalId: null,
  previewBaseItinerary: null,
  previewItinerary: null,
  crossDayDragInfo: null,
  draggingActivityId: null,
  hoveredDayNumber: null,
  hoveredActivityId: null,
  focusedActivityId: null,
  isAddingActivity: false,
  addingActivityTarget: null,
  addModePlaceholder: null,

  // Basic Setters
  setCrossDayDragInfo: (info) => set({ crossDayDragInfo: info }),
  setDraggingActivityId: (id) => set({ draggingActivityId: id }),
  setHoveredDay: (dayNumber) => set({ hoveredDayNumber: dayNumber }),
  setHoveredActivity: (activityId) => set({ hoveredActivityId: activityId }),
  setFocusedActivity: (activityId) => set({ focusedActivityId: activityId }),
  setIsAddingActivity: (flag) =>
    set({
      isAddingActivity: flag,
      ...(flag ? {} : { addModePlaceholder: null }),
    }),
  setAddingActivityTarget: (target) => set({ addingActivityTarget: target }),
  setAddModePlaceholder: (placeholder) => set({ addModePlaceholder: placeholder }),

  canEdit: () => {
    const { permission } = get();
    return permission === "owner" || permission === "edit";
  },

  canDelete: () => {
    const { permission } = get();
    return permission === "owner";
  },

  canShare: () => {
    const { permission } = get();
    return permission === "owner";
  },

  // Fetch Action
  fetchItinerary: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await loadItinerary(id);
      const permission = await getEffectivePermission(
        data.id,
        data.user_id,
        data.link_access
      );

      set({
        itinerary: data,
        permission,
        historyPast: [],
        historyFuture: [],
        previewBaseItinerary: null,
        previewItinerary: null,
      });
    } catch (err) {
      console.error("Failed to load itinerary:", err);
      set({ error: "Failed to load itinerary. Please try again." });
    } finally {
      set({ isLoading: false });
    }
  },

  commitItineraryChange: async (nextItinerary) => {
    const state = get();
    const currentItinerary = state.itinerary;
    if (!currentItinerary) return;

    const payload: Partial<Itinerary> = {
      title: nextItinerary.title,
      destination: nextItinerary.destination,
      start_date: nextItinerary.start_date,
      end_date: nextItinerary.end_date,
      preferences: nextItinerary.preferences,
      days: nextItinerary.days,
    };

    const nextPast = [
      ...state.historyPast,
      cloneItinerarySnapshot(currentItinerary),
    ].slice(-MAX_HISTORY_ENTRIES);

    set({
      itinerary: nextItinerary,
      historyPast: nextPast,
      historyFuture: [],
    });

    try {
      const updated = await updateItinerary(currentItinerary.id, payload);
      set({ itinerary: updated });
    } catch (err) {
      console.error("Failed to commit itinerary:", err);
      set({
        itinerary: currentItinerary,
        historyPast: state.historyPast,
        historyFuture: state.historyFuture,
      });
      throw err;
    }
  },

  undo: async () => {
    const state = get();
    const currentItinerary = state.itinerary;
    const previousItinerary = state.historyPast[state.historyPast.length - 1];

    if (!currentItinerary || !previousItinerary) return;

    const nextPast = state.historyPast.slice(0, -1);
    const nextFuture = [cloneItinerarySnapshot(currentItinerary), ...state.historyFuture];
    const payload: Partial<Itinerary> = {
      title: previousItinerary.title,
      destination: previousItinerary.destination,
      start_date: previousItinerary.start_date,
      end_date: previousItinerary.end_date,
      preferences: previousItinerary.preferences,
      days: previousItinerary.days,
    };

    get().discardPreview();
    get().resetDragState();

    set({
      itinerary: previousItinerary,
      historyPast: nextPast,
      historyFuture: nextFuture,
      isSaving: true,
    });

    try {
      const updated = await updateItinerary(currentItinerary.id, payload);
      set({ itinerary: updated });
    } catch (err) {
      console.error("Failed to undo itinerary change:", err);
      set({
        itinerary: currentItinerary,
        historyPast: state.historyPast,
        historyFuture: state.historyFuture,
      });
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  redo: async () => {
    const state = get();
    const currentItinerary = state.itinerary;
    const nextItinerary = state.historyFuture[0];

    if (!currentItinerary || !nextItinerary || state.isGenerating) return;

    const nextPast = [...state.historyPast, cloneItinerarySnapshot(currentItinerary)];
    const nextFuture = state.historyFuture.slice(1);
    const payload: Partial<Itinerary> = {
      title: nextItinerary.title,
      destination: nextItinerary.destination,
      start_date: nextItinerary.start_date,
      end_date: nextItinerary.end_date,
      preferences: nextItinerary.preferences,
      days: nextItinerary.days,
    };

    get().discardPreview();
    get().resetDragState();

    set({
      itinerary: nextItinerary,
      historyPast: nextPast,
      historyFuture: nextFuture,
      isSaving: true,
    });

    try {
      const updated = await updateItinerary(currentItinerary.id, payload);
      set({ itinerary: updated });
    } catch (err) {
      console.error("Failed to redo itinerary change:", err);
      set({
        itinerary: currentItinerary,
        historyPast: state.historyPast,
        historyFuture: state.historyFuture,
      });
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  getCanUndo: () => get().historyPast.length > 0,
  getCanRedo: () => get().historyFuture.length > 0,

  startPreview: (baseItinerary) => {
    const state = get();
    const previewBase = baseItinerary ?? state.itinerary;
    if (!previewBase) return;

    set({
      previewBaseItinerary: cloneItinerarySnapshot(previewBase),
      previewItinerary: cloneItinerarySnapshot(previewBase),
    });
  },

  updatePreview: (nextItinerary) => {
    set({ previewItinerary: nextItinerary });
  },

  applyPreview: async () => {
    const state = get();
    const previewItinerary = state.previewItinerary;
    const previewBaseItinerary = state.previewBaseItinerary;

    if (!previewItinerary || !previewBaseItinerary) {
      get().discardPreview();
      get().resetDragState();
      return;
    }

    if (serializeItinerary(previewBaseItinerary) === serializeItinerary(previewItinerary)) {
      get().discardPreview();
      get().resetDragState();
      return;
    }

    set({ isSaving: true });
    try {
      await get().commitItineraryChange(previewItinerary);
    } finally {
      get().discardPreview();
      get().resetDragState();
      set({ isSaving: false });
    }
  },

  discardPreview: () =>
    set({
      previewBaseItinerary: null,
      previewItinerary: null,
    }),

  resetDragState: () =>
    set({
      crossDayDragInfo: null,
      draggingActivityId: null,
    }),

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

    const nextItinerary: Itinerary = {
      ...currentItinerary,
      title: updates.title ?? currentItinerary.title,
      destination: updates.destination ?? currentItinerary.destination,
      start_date: newStart,
      end_date: newEnd,
      preferences:
        updates.preferences !== undefined
          ? updates.preferences
          : currentItinerary.preferences,
      days:
        newDayCount !== oldDayCount
          ? adjustDays(currentItinerary.days, newDayCount)
          : currentItinerary.days,
    };

    if (serializeItinerary(currentItinerary) === serializeItinerary(nextItinerary)) {
      return;
    }

    set({ isSaving: true });
    try {
      await get().commitItineraryChange(nextItinerary);
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

    set({ isSaving: true });
    try {
      await get().commitItineraryChange(optimisticItinerary);
    } catch (err) {
      console.error("Failed to apply AI operations:", err);
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
      const resolvedLocation = await resolvePlaceDetails({
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

      await get().commitItineraryChange({
        ...state.itinerary,
        days,
        updated_at: new Date().toISOString(),
      });
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
      activityInput.duration !== existingActivity.duration_minutes;

    if (!isDirty) return;

    set({ isSaving: true });
    try {
      let resolvedLocation = existingActivity.location;
      if (activityInput.locationName !== existingActivity.location.name) {
        resolvedLocation = await resolvePlaceDetails({
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
      };

      const newDays = state.itinerary.days.map((day) => ({
        ...day,
        activities: day.activities.map((activity) =>
          activity.id === activityId ? updatedActivity : activity
        ),
      }));

      await get().commitItineraryChange({
        ...state.itinerary,
        days: newDays,
        updated_at: new Date().toISOString(),
      });
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

      await get().commitItineraryChange({
        ...state.itinerary,
        days: newDays,
        updated_at: new Date().toISOString(),
      });
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
        // Day already exists, add activity to it and sort by its native order
        const updatedActivities = [...days[existingDayIdx].activities, activity];
        updatedActivities.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        days[existingDayIdx] = {
          ...days[existingDayIdx],
          activities: updatedActivities,
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
    if (!state.previewItinerary) return;

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
      state.previewItinerary
    );

    if (result) {
      get().updatePreview(result.newItinerary);
      set({ crossDayDragInfo: result.crossDayInfo });
    }
  },
}));

function cloneItinerarySnapshot(itinerary: Itinerary): Itinerary {
  return structuredClone(itinerary);
}

function serializeItinerary(itinerary: Itinerary): string {
  return JSON.stringify(itinerary);
}
