import { buildDistanceMatrix } from "./distance-matrix";
import { callVroom } from "./vroom";
import { greedyFallback } from "./greedy";
import { enrichActivities, extractTimeWindow, getDayOfWeek } from "./places";
import type {
  ActivityInput,
  OptimizeRequest,
  OptimizeResult,
  FullOptimizeResult,
  EnrichedActivity,
} from "./types";

function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// ── 快速版（對應 /optimize）──────────────────────────────────

export async function optimizeRoute(req: OptimizeRequest): Promise<OptimizeResult> {
  const { activities, mode, start_time, end_time } = req;
  console.info(`\n[optimize-route] n=${activities.length}, mode=${mode}, window=${start_time}–${end_time}`);

  if (activities.length <= 1) {
    console.info("[optimize-route] n<=1, returning as-is");
    return { order: activities.map((a) => a.id), travel_times_minutes: [], start_times: activities.map((a) => a.time) };
  }

  const matrix = await buildDistanceMatrix(activities, mode);

  // 佔位符（isMealPlaceholder）距離全設 0，不影響其他活動的路線成本
  const placeholderIndices = activities
    .map((a, i) => (a.isMealPlaceholder ? i : -1))
    .filter((i) => i >= 0);
  if (placeholderIndices.length > 0) {
    for (const pi of placeholderIndices) {
      for (let j = 0; j < matrix.length; j++) {
        matrix[pi][j] = 0;
        matrix[j][pi] = 0;
      }
    }
    console.info(`[meal-placeholder] Zeroed matrix rows/cols for indices: [${placeholderIndices}]`);
  }

  const vroom = await callVroom(activities, matrix, mode, start_time, end_time);
  if (vroom) return vroom;

  console.info("[optimize-route] Vroom failed — using greedy fallback");
  return greedyFallback(activities, matrix, parseTimeToMinutes(start_time));
}

// ── 完整版（對應 /optimize/full）────────────────────────────

export async function optimizeRouteFull(
  req: OptimizeRequest & { date: string }
): Promise<FullOptimizeResult> {
  const { activities, mode, start_time, end_time, date } = req;
  console.info(`\n[optimize-route-full] n=${activities.length}, mode=${mode}, window=${start_time}–${end_time}, date=${date}`);

  if (activities.length <= 1) {
    console.info("[optimize-route-full] n<=1, enriching then returning as-is");
    const enriched = await enrichActivities(activities);
    return {
      order: activities.map((a) => a.id),
      travel_times_minutes: [],
      start_times: activities.map((a) => a.time),
      enriched_activities: enriched,
    };
  }

  // 佔位符不需要 Places 豐富化
  const toEnrich = activities.filter((a) => !a.isMealPlaceholder);
  const placeholderIds = new Set(activities.filter((a) => a.isMealPlaceholder).map((a) => a.id));
  if (placeholderIds.size > 0) {
    console.info(`[meal-placeholder] Skipping enrichment for ${placeholderIds.size} placeholder(s)`);
  }

  // 豐富化 + 初始距離矩陣 平行執行
  console.info("[optimize-route-full] running enrichActivities + buildDistanceMatrix in parallel");
  const [enrichedPartial, initialMatrix] = await Promise.all([
    enrichActivities(toEnrich),
    buildDistanceMatrix(activities, mode),
  ]);

  // 合回完整 enriched 陣列（佔位符用原始座標補位）
  const enrichedMap = new Map(enrichedPartial.map((e) => [e.id, e]));
  const enriched = activities.map((a) =>
    enrichedMap.get(a.id) ?? { id: a.id, lat: a.lat, lng: a.lng }
  );

  const enrichedWithPlaceId = enriched.filter((e) => e.place_id).length;
  console.info(`[optimize-route-full] enriched ${enrichedWithPlaceId}/${activities.length} activities with place data`);

  // 用精確座標建 enrichedInputs（附上當日時間窗口）
  const dayOfWeek = getDayOfWeek(date);
  const enrichedInputs: ActivityInput[] = activities.map((orig, i) => {
    const e: EnrichedActivity = enriched[i];
    let opening_hours = orig.opening_hours;

    // 優先使用 Google Places 回傳的時間窗口
    if (e.opening_hours) {
      const tw = extractTimeWindow(e.opening_hours, dayOfWeek);
      if (tw) opening_hours = tw;
    }

    return {
      ...orig,
      lat: e.lat,
      lng: e.lng,
      opening_hours,
    };
  });

  // 佔位符距離全設 0
  const fullPlaceholderIndices = activities
    .map((a, i) => (a.isMealPlaceholder ? i : -1))
    .filter((i) => i >= 0);

  // 若任何 activity 座標變動超過 0.001 度，重建距離矩陣
  const coordsChanged = activities.some((orig, i) => {
    const e = enriched[i];
    return Math.abs(orig.lat - e.lat) > 0.001 || Math.abs(orig.lng - e.lng) > 0.001;
  });

  if (coordsChanged) {
    console.info("[optimize-route-full] coordinates changed >0.001°, rebuilding distance matrix");
  }

  const matrix = coordsChanged
    ? await buildDistanceMatrix(enrichedInputs, mode)
    : initialMatrix;

  if (fullPlaceholderIndices.length > 0) {
    for (const pi of fullPlaceholderIndices) {
      for (let j = 0; j < matrix.length; j++) {
        matrix[pi][j] = 0;
        matrix[j][pi] = 0;
      }
    }
    console.info(`[meal-placeholder] Zeroed matrix rows/cols for indices: [${fullPlaceholderIndices}]`);
  }

  const vroom = await callVroom(enrichedInputs, matrix, mode, start_time, end_time);
  if (!vroom) {
    console.info("[optimize-route-full] Vroom failed — using greedy fallback");
  }
  const result = vroom ?? greedyFallback(enrichedInputs, matrix, parseTimeToMinutes(start_time));

  return { ...result, enriched_activities: enriched };
}
