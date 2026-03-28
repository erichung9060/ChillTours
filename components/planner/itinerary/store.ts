import { create } from "zustand";
import type { Itinerary, Activity, Day } from "@/types/itinerary";
import type { TransportMode } from "./types";
import type { Active, Over } from "@dnd-kit/core";
import { calculateDragOverUpdate } from "./utils/drag-handlers";
import { loadItinerary, updateItinerary } from "@/lib/supabase/itineraries";
import { applyOperations, type OperationsUpdate } from "@/lib/ai/operations";
import { aiClient } from "@/lib/ai/client";
import { calcDayCount, calculateDayDate } from "@/lib/utils/date";
import { adjustDays } from "@/lib/utils/itinerary";
import { DEFAULT_DAY_START, DEFAULT_DAY_END, MEAL_WINDOWS } from "@/lib/route-optimization/config";
import type { RestaurantCandidate } from "@/app/api/places-nearby/route";

// ── Meal Search Types ─────────────────────────────────────────
export interface MealSuggestion {
  dayNumber: number;
  mealType: "lunch" | "dinner";
  placeholderId: string;
  restaurants: RestaurantCandidate[];
  searchLat: number;
  searchLng: number;
}

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
  addActivity: (dayNumber: number, activity: Activity, insertionIndex?: number) => Promise<void>;
  updateActivity: (updatedActivity: Activity) => Promise<void>;
  deleteActivity: (activityId: string) => Promise<void>;
  updateDays: (newDays: Day[]) => Promise<void>;

  // Generation Actions
  isPerfectMode: boolean;
  startStreaming: (itineraryId: string, locale: string, perfectMode?: boolean) => Promise<void>;
  appendStreamedActivity: (dayNumber: number, activity: Activity) => void;
  completeGeneration: () => void;
  startPolling: (itineraryId: string) => void;
  stopPolling: () => void;
  applyOperations: (ops: OperationsUpdate) => Promise<void>;
  autoOptimizeAllDays: () => Promise<void>;

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

  // Route Optimization
  isOptimizingDay: number | null;
  isAutoOptimizing: boolean;
  optimizeDay: (dayNumber: number) => Promise<void>;
  isOptimizingDayFull: number | null;
  optimizeDayFull: (dayNumber: number) => Promise<void>;
  setDayTransportMode: (dayNumber: number, mode: TransportMode) => Promise<void>;

  // Meal Search (Phase B)
  mealSuggestions: MealSuggestion[];
  optimizeDayWithMealSearch: (dayNumber: number) => Promise<void>;
  selectMealRestaurant: (dayNumber: number, placeholderId: string, restaurant: RestaurantCandidate) => Promise<void>;
  dismissMealSuggestion: (placeholderId: string) => void;

  // Day Time Window
  setDayTimeWindow: (dayNumber: number, startTime: string, endTime: string) => Promise<void>;
  setAllDaysTimeWindow: (startTime: string, endTime: string) => Promise<void>;
}

export const useItineraryStore = create<ItineraryState>((set, get) => ({
  // Initial State
  itinerary: null,
  isLoading: false,
  error: null,
  isGenerating: false,
  isSaving: false,
  isPerfectMode: false,
  isAutoOptimizing: false,
  generationAbortController: null,
  pollingIntervalId: null,
  crossDayDragInfo: null,
  draggingActivityId: null,
  hoveredDayNumber: null,
  hoveredActivityId: null,
  isAddingActivity: false,
  addingActivityTarget: null,
  addModePlaceholder: null,
  isOptimizingDay: null,
  isOptimizingDayFull: null,
  mealSuggestions: [],

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
  addActivity: async (dayNumber, activity, insertionIndex?: number) => {
    const state = get();
    if (!state.itinerary) return;

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

    set({ isSaving: true });
    try {
      const updated = await updateItinerary(state.itinerary.id, { days });
      set({ itinerary: updated });
    } catch (err) {
      console.error("Failed to add activity:", err);
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  // Update Single Activity
  updateActivity: async (updatedActivity) => {
    const state = get();
    if (!state.itinerary) return;

    const newDays = state.itinerary.days.map((day) => ({
      ...day,
      activities: day.activities.map((activity) =>
        activity.id === updatedActivity.id ? updatedActivity : activity
      ),
    }));

    set({ isSaving: true });
    try {
      const updated = await updateItinerary(state.itinerary.id, { days: newDays });
      set({ itinerary: updated });
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

    const newDays = state.itinerary.days.map((day) => ({
      ...day,
      activities: day.activities.filter((activity) => activity.id !== activityId),
    }));

    set({ isSaving: true });
    try {
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
  startStreaming: async (itineraryId, locale, perfectMode = false) => {
    const state = get();

    // Concurrency guard: abort any in-flight stream (handles React StrictMode double-invoke)
    if (state.generationAbortController) {
      state.generationAbortController.abort();
    }

    const controller = new AbortController();
    set({ isGenerating: true, isPerfectMode: perfectMode, generationAbortController: controller });

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

  completeGeneration: () => {
    const { isPerfectMode } = get();
    set({ isGenerating: false, generationAbortController: null });
    if (isPerfectMode) get().autoOptimizeAllDays();
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

  // Route Optimization
  optimizeDay: async (dayNumber: number) => {
    const state = get();
    if (!state.itinerary) return;

    const day = state.itinerary.days.find((d) => d.day_number === dayNumber);
    if (!day || day.activities.length <= 1) return;

    set({ isOptimizingDay: dayNumber });

    try {
      const response = await fetch("/api/optimize-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activities: day.activities.map((a) => {
            const mealWindow = a.type && MEAL_WINDOWS[a.type] ? MEAL_WINDOWS[a.type] : null;
            const opening_hours = a.opening_hours ?? mealWindow ?? undefined;
            return {
              id: a.id,
              title: a.title,
              lat: a.location.lat,
              lng: a.location.lng,
              duration_minutes: a.duration_minutes,
              time: a.time,
              flexible: a.flexible,
              ...(a.type ? { type: a.type } : {}),
              ...(opening_hours ? { opening_hours } : {}),
              ...(a.importance ? { importance: a.importance } : {}),
            };
          }),
          mode: day.transport_mode ?? "driving",
          start_time: day.start_time ?? DEFAULT_DAY_START,
          end_time: day.end_time ?? DEFAULT_DAY_END,
        }),
      });

      if (!response.ok) {
        throw new Error(`Optimize request failed: ${response.status}`);
      }

      const { order, start_times } = await response.json() as {
        order: string[];
        travel_times_minutes: number[];
        start_times: string[];
      };

      // Build a lookup map for activities by ID
      const activityById = Object.fromEntries(day.activities.map((a) => [a.id, a]));

      const reorderedActivities = order.map((id, i) => ({
        ...activityById[id],
        order: i,
        time: start_times[i] ?? activityById[id].time,
      }));

      const newDays = state.itinerary.days.map((d) =>
        d.day_number === dayNumber ? { ...d, activities: reorderedActivities } : d
      );

      await get().updateDays(newDays);
    } catch (err) {
      console.error("Failed to optimize route:", err);
    } finally {
      set({ isOptimizingDay: null });
    }
  },

  // Full Route Optimization (with Place enrichment + time windows)
  optimizeDayFull: async (dayNumber: number) => {
    const state = get();
    if (!state.itinerary) return;

    const day = state.itinerary.days.find((d) => d.day_number === dayNumber);
    if (!day || day.activities.length <= 1) return;

    set({ isOptimizingDayFull: dayNumber });

    try {
      const dayDate = calculateDayDate(state.itinerary.start_date, dayNumber);

      const response = await fetch("/api/optimize-route-full", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activities: day.activities.map((a) => ({
            id: a.id,
            title: a.location.name,
            lat: a.location.lat,
            lng: a.location.lng,
            duration_minutes: a.duration_minutes,
            time: a.time,
            flexible: a.flexible,
            ...(a.type ? { type: a.type } : {}),
            ...(a.opening_hours ? { opening_hours: a.opening_hours } : {}),
            ...(a.importance ? { importance: a.importance } : {}),
          })),
          mode: day.transport_mode ?? "driving",
          date: dayDate,
          start_time: day.start_time ?? DEFAULT_DAY_START,
          end_time: day.end_time ?? DEFAULT_DAY_END,
        }),
      });

      if (!response.ok) {
        throw new Error(`Full optimize request failed: ${response.status}`);
      }

      const { order, start_times, enriched_activities } = await response.json() as {
        order: string[];
        travel_times_minutes: number[];
        start_times: string[];
        enriched_activities: Array<{
          id: string;
          place_id?: string;
          lat: number;
          lng: number;
          rating?: number;
          opening_hours?: object;
        }>;
      };

      // Build lookup maps
      const activityById = Object.fromEntries(day.activities.map((a) => [a.id, a]));
      const enrichedById = Object.fromEntries(enriched_activities.map((e) => [e.id, e]));

      const reorderedActivities = order.map((id, i) => {
        const base = activityById[id];
        const enriched = enrichedById[id];
        return {
          ...base,
          order: i,
          time: start_times[i] ?? base.time,
          location: {
            ...base.location,
            lat: enriched?.lat ?? base.location.lat,
            lng: enriched?.lng ?? base.location.lng,
            ...(enriched?.place_id ? { place_id: enriched.place_id } : {}),
          },
        };
      });

      const newDays = state.itinerary.days.map((d) =>
        d.day_number === dayNumber ? { ...d, activities: reorderedActivities } : d
      );

      await get().updateDays(newDays);
    } catch (err) {
      console.error("Failed to run full route optimization:", err);
    } finally {
      set({ isOptimizingDayFull: null });
    }
  },

  // ── Phase B：Meal Placeholder Helpers ────────────────────────

  // 判斷並插入用餐佔位符（不修改 store，純粹回傳加入佔位符後的陣列）
  // 返回 [activitiesWithPlaceholders, placeholderIds]
  // （作為 closure helper 使用，不放入 state）

  // Auto-optimize all days after "完美安排" generation
  autoOptimizeAllDays: async () => {
    const state = get();
    if (!state.itinerary) return;

    set({ isAutoOptimizing: true });

    try {
      for (const day of state.itinerary.days) {
        if (day.activities.length === 0) continue;
        try {
          await get().optimizeDayWithMealSearch(day.day_number);
        } catch (err) {
          console.error(`Failed to auto-optimize day ${day.day_number}:`, err);
        }
      }
    } finally {
      set({ isAutoOptimizing: false, isPerfectMode: false });
    }
  },

  // ── Phase B：optimizeDayWithMealSearch ───────────────────────

  optimizeDayWithMealSearch: async (dayNumber: number) => {
    const state = get();
    if (!state.itinerary) return;

    const day = state.itinerary.days.find((d) => d.day_number === dayNumber);
    if (!day || day.activities.length === 0) return;

    const startTime = day.start_time ?? DEFAULT_DAY_START;
    const endTime = day.end_time ?? DEFAULT_DAY_END;

    // 解析時間（分鐘）
    const parseMin = (hhmm: string) => {
      const [h, m] = hhmm.split(":").map(Number);
      return h * 60 + m;
    };
    const startMin = parseMin(startTime);
    const endMin = parseMin(endTime);
    const lunchOpen = parseMin(MEAL_WINDOWS.lunch.open);   // 11:00 = 660
    const lunchClose = parseMin(MEAL_WINDOWS.lunch.close);  // 14:00 = 840
    const dinnerOpen = parseMin(MEAL_WINDOWS.dinner.open);  // 17:30 = 1050
    const dinnerClose = parseMin(MEAL_WINDOWS.dinner.close); // 21:00 = 1260

    const hasLunch = day.activities.some((a) => a.type === "lunch");
    const hasDinner = day.activities.some((a) => a.type === "dinner");

    // 時間窗涵蓋用餐時段 → 需插入佔位符
    const needLunch = !hasLunch && startMin < lunchClose && endMin > lunchOpen;
    const needDinner = !hasDinner && startMin < dinnerClose && endMin > dinnerOpen;

    if (!needLunch && !needDinner) {
      console.info(`[meal-placeholder] Day ${dayNumber}: no meal placeholders needed`);
    }

    const firstAct = day.activities[0];
    const dummyLat = firstAct?.location.lat ?? 25.0;
    const dummyLng = firstAct?.location.lng ?? 121.5;

    const placeholders: Activity[] = [];

    if (needLunch) {
      console.info(`[meal-placeholder] Day ${dayNumber}: inserting lunch placeholder (${startTime}–${endTime} spans ${MEAL_WINDOWS.lunch.open}–${MEAL_WINDOWS.lunch.close})`);
      placeholders.push({
        id: `meal-placeholder-lunch-day${dayNumber}`,
        title: "午餐",
        note: "",
        type: "lunch",
        duration_minutes: 90,
        time: "12:00",
        location: { name: "午餐", lat: dummyLat, lng: dummyLng },
        order: 9990,
        flexible: true,
        opening_hours: MEAL_WINDOWS.lunch,
      } as Activity & { isMealPlaceholder?: boolean });
    }
    if (needDinner) {
      console.info(`[meal-placeholder] Day ${dayNumber}: inserting dinner placeholder (${startTime}–${endTime} spans ${MEAL_WINDOWS.dinner.open}–${MEAL_WINDOWS.dinner.close})`);
      placeholders.push({
        id: `meal-placeholder-dinner-day${dayNumber}`,
        title: "晚餐",
        note: "",
        type: "dinner",
        duration_minutes: 120,
        time: "18:30",
        location: { name: "晚餐", lat: dummyLat, lng: dummyLng },
        order: 9991,
        flexible: true,
        opening_hours: MEAL_WINDOWS.dinner,
      } as Activity & { isMealPlaceholder?: boolean });
    }

    const activitiesWithPlaceholders = [...day.activities, ...placeholders];
    const placeholderIds = new Set(placeholders.map((p) => p.id));

    console.info(`[meal-placeholder] Day ${dayNumber}: optimizing with ${placeholders.length} placeholder(s)`);

    set({ isOptimizingDay: dayNumber });

    try {
      const response = await fetch("/api/optimize-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activities: activitiesWithPlaceholders.map((a) => {
            const mealWindow = a.type && MEAL_WINDOWS[a.type] ? MEAL_WINDOWS[a.type] : null;
            const opening_hours = a.opening_hours ?? mealWindow ?? undefined;
            return {
              id: a.id,
              title: a.title,
              lat: a.location.lat ?? dummyLat,
              lng: a.location.lng ?? dummyLng,
              duration_minutes: a.duration_minutes,
              time: a.time,
              flexible: a.flexible,
              ...(a.type ? { type: a.type } : {}),
              ...(opening_hours ? { opening_hours } : {}),
              ...(placeholderIds.has(a.id) ? { isMealPlaceholder: true } : {}),
            };
          }),
          mode: day.transport_mode ?? "driving",
          start_time: startTime,
          end_time: endTime,
        }),
      });

      if (!response.ok) throw new Error(`Optimize request failed: ${response.status}`);

      const { order, start_times } = await response.json() as {
        order: string[];
        start_times: string[];
        travel_times_minutes: number[];
      };

      // 找出佔位符在排序後的位置，確定前後景點
      const newMealSuggestions: MealSuggestion[] = [];

      for (const placeholder of placeholders) {
        const pidx = order.indexOf(placeholder.id);
        if (pidx === -1) continue;

        const prevId = order[pidx - 1];
        const nextId = order[pidx + 1];
        const actMap = Object.fromEntries(activitiesWithPlaceholders.map((a) => [a.id, a]));

        const prevAct = prevId ? actMap[prevId] : null;
        const nextAct = nextId ? actMap[nextId] : null;

        const searchLat = prevAct && nextAct
          ? ((prevAct.location.lat ?? dummyLat) + (nextAct.location.lat ?? dummyLat)) / 2
          : (prevAct?.location.lat ?? nextAct?.location.lat ?? dummyLat);
        const searchLng = prevAct && nextAct
          ? ((prevAct.location.lng ?? dummyLng) + (nextAct.location.lng ?? dummyLng)) / 2
          : (prevAct?.location.lng ?? nextAct?.location.lng ?? dummyLng);

        console.info(
          `[meal-placeholder] Day ${dayNumber}: ${placeholder.type} placeholder between ` +
          `[${prevAct?.title ?? "起點"}] and [${nextAct?.title ?? "終點"}]`
        );
        console.info(`[meal-search] Fetching restaurants near (${searchLat.toFixed(4)}, ${searchLng.toFixed(4)}) radius=${placeholder.type === "lunch" ? 500 : 800}m`);

        try {
          const nearbyRes = await fetch("/api/places-nearby", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lat: searchLat,
              lng: searchLng,
              radius: placeholder.type === "lunch" ? 500 : 800,
            }),
          });
          if (nearbyRes.ok) {
            const { restaurants } = await nearbyRes.json() as { restaurants: RestaurantCandidate[] };
            console.info(
              `[meal-search] Found: ${restaurants.map((r) => `${r.name}(${r.rating ?? "n/a"}★)`).join(", ") || "none"}`
            );
            newMealSuggestions.push({
              dayNumber,
              mealType: placeholder.type as "lunch" | "dinner",
              placeholderId: placeholder.id,
              restaurants,
              searchLat,
              searchLng,
            });
          }
        } catch (err) {
          console.warn(`[meal-search] Nearby search failed for day ${dayNumber} ${placeholder.type}:`, err);
        }
      }

      // 儲存排序結果（排除佔位符）
      const activityById = Object.fromEntries(day.activities.map((a) => [a.id, a]));
      const reorderedActivities = order
        .filter((id) => !placeholderIds.has(id))
        .map((id, i) => ({
          ...activityById[id],
          order: i,
          time: start_times[order.indexOf(id)] ?? activityById[id].time,
        }));

      const newDays = get().itinerary!.days.map((d) =>
        d.day_number === dayNumber ? { ...d, activities: reorderedActivities } : d
      );

      await get().updateDays(newDays);

      if (newMealSuggestions.length > 0) {
        set((s) => ({
          mealSuggestions: [
            ...s.mealSuggestions.filter((ms) => ms.dayNumber !== dayNumber),
            ...newMealSuggestions,
          ],
        }));
      }
    } catch (err) {
      console.error(`[meal-placeholder] Failed for day ${dayNumber}:`, err);
    } finally {
      set({ isOptimizingDay: null });
    }
  },

  // ── Phase B：selectMealRestaurant ─────────────────────────────

  selectMealRestaurant: async (dayNumber: number, placeholderId: string, restaurant: RestaurantCandidate) => {
    const state = get();
    if (!state.itinerary) return;

    const day = state.itinerary.days.find((d) => d.day_number === dayNumber);
    if (!day) return;

    const suggestion = state.mealSuggestions.find((ms) => ms.placeholderId === placeholderId);
    if (!suggestion) return;

    console.info(`[meal-select] User selected ${restaurant.name} for day ${dayNumber} ${suggestion.mealType}, re-optimizing`);

    const newActivity: Activity = {
      id: placeholderId,
      title: restaurant.name,
      note: "",
      type: suggestion.mealType,
      duration_minutes: suggestion.mealType === "lunch" ? 90 : 120,
      time: suggestion.mealType === "lunch" ? "12:00" : "18:30",
      location: {
        name: restaurant.name,
        lat: restaurant.lat,
        lng: restaurant.lng,
        place_id: restaurant.place_id,
      },
      order: day.activities.length,
      flexible: true,
      ...(restaurant.opening_hours
        ? { opening_hours: restaurant.opening_hours as Activity["opening_hours"] }
        : { opening_hours: MEAL_WINDOWS[suggestion.mealType] }),
    };

    // 重新讀取最新 day 狀態（避免並發選擇覆蓋彼此的 updateDays）
    const freshDay = get().itinerary!.days.find((d) => d.day_number === dayNumber);
    if (!freshDay) return;
    const activitiesWithMeal = [...freshDay.activities, newActivity];
    const newDaysWithMeal = get().itinerary!.days.map((d) =>
      d.day_number === dayNumber ? { ...d, activities: activitiesWithMeal } : d
    );
    await get().updateDays(newDaysWithMeal);

    // 從 mealSuggestions 移除此佔位符
    set((s) => ({
      mealSuggestions: s.mealSuggestions.filter((ms) => ms.placeholderId !== placeholderId),
    }));

    // 第二次優化（含真實餐廳）
    await get().optimizeDayFull(dayNumber);
  },

  // ── Phase B：dismissMealSuggestion ───────────────────────────

  dismissMealSuggestion: (placeholderId: string) => {
    set((s) => ({
      mealSuggestions: s.mealSuggestions.filter((ms) => ms.placeholderId !== placeholderId),
    }));
  },

  // Day Time Window
  setDayTimeWindow: async (dayNumber, startTime, endTime) => {
    const state = get();
    if (!state.itinerary) return;
    const newDays = state.itinerary.days.map((d) =>
      d.day_number === dayNumber ? { ...d, start_time: startTime, end_time: endTime } : d
    );
    await get().updateDays(newDays);
  },

  setAllDaysTimeWindow: async (startTime, endTime) => {
    const state = get();
    if (!state.itinerary) return;
    const newDays = state.itinerary.days.map((d) => ({ ...d, start_time: startTime, end_time: endTime }));
    await get().updateDays(newDays);
  },

  setDayTransportMode: async (dayNumber, mode) => {
    const state = get();
    if (!state.itinerary) return;
    const newDays = state.itinerary.days.map((d) =>
      d.day_number === dayNumber ? { ...d, transport_mode: mode } : d
    );
    await get().updateDays(newDays);
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
