import type { ActivityInput, OptimizeResult } from "./types";

function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * 時間窗口感知的貪心最近鄰算法（移植自 Python _layer3_greedy）。
 * 不依賴任何外部 API，永遠回傳結果。
 */
export function greedyFallback(
  activities: ActivityInput[],
  matrix: number[][],
  startTimeMinutes: number
): OptimizeResult {
  const n = activities.length;
  const hasWindows = activities.some((a) => a.opening_hours);

  console.info(`[greedy] fallback — ${n} activities, hasWindows=${hasWindows}`);

  // 起點：有時間窗口時從最早開門的地點出發
  let start = 0;
  if (hasWindows) {
    let earliest = Infinity;
    activities.forEach((a, i) => {
      const open = a.opening_hours ? parseTimeToMinutes(a.opening_hours.open) : 9999;
      if (open < earliest) { earliest = open; start = i; }
    });
    console.info(`[greedy] start at earliest-opening: ${activities[start].title} (${activities[start].opening_hours?.open ?? "?"})`);
  }

  const unvisited = new Set(Array.from({ length: n }, (_, i) => i));
  let current = start;
  unvisited.delete(start);
  const route = [start];
  let currentTime = startTimeMinutes;

  while (unvisited.size > 0) {
    let nextNode = -1;

    if (hasWindows) {
      // 優先選可在窗口內抵達且等待+行駛最少的
      let bestScore: [number, number] = [3, Infinity];
      for (const j of unvisited) {
        const travel = matrix[current][j];
        const arrive = currentTime + activities[current].duration_minutes + travel;
        let score: [number, number];
        if (activities[j].opening_hours) {
          const open  = parseTimeToMinutes(activities[j].opening_hours!.open);
          const close = parseTimeToMinutes(activities[j].opening_hours!.close);
          if (arrive > close) {
            score = [2, travel]; // 已錯過窗口，最低優先
          } else {
            const wait = Math.max(0, open - arrive);
            score = [0, wait + travel]; // 優先：等待+行駛最少
          }
        } else {
          score = [1, travel]; // 無窗口，次要優先
        }
        if (score[0] < bestScore[0] || (score[0] === bestScore[0] && score[1] < bestScore[1])) {
          bestScore = score;
          nextNode = j;
        }
      }
      const travel = matrix[current][nextNode];
      const arrive = currentTime + activities[current].duration_minutes + travel;
      if (activities[nextNode].opening_hours) {
        const open = parseTimeToMinutes(activities[nextNode].opening_hours!.open);
        currentTime = Math.max(arrive, open);
      } else {
        currentTime = arrive;
      }
    } else {
      // 無時間窗口：純最近鄰
      let minTravel = Infinity;
      for (const j of unvisited) {
        if (matrix[current][j] < minTravel) {
          minTravel = matrix[current][j];
          nextNode = j;
        }
      }
    }

    route.push(nextNode);
    unvisited.delete(nextNode);
    current = nextNode;
  }

  const order = route.map((i) => activities[i].id);
  const travelTimes = route.slice(0, -1).map((from, k) =>
    Math.max(1, matrix[from][route[k + 1]])
  );

  const totalTravel = travelTimes.reduce((a, b) => a + b, 0);
  console.info(`[greedy] total_travel=${totalTravel}min`);
  console.info(`  order: ${route.map((i) => activities[i].title).join(" → ")}`);
  console.info(`  travel_times: [${travelTimes.join(", ")}] min`);

  return { order, travel_times_minutes: travelTimes };
}
