export type TransportMode = "driving" | "walking" | "transit" | "bicycling";

export interface ActivityInput {
  id: string;
  title: string;
  lat: number;
  lng: number;
  duration_minutes: number;
  time: string; // "HH:MM"
  opening_hours?: { open: string; close: string };
  flexible?: boolean;
  type?: "lunch" | "dinner" | "breakfast" | "transit";
  importance?: "must" | "preferred";
  isMealPlaceholder?: boolean; // 距離矩陣全設 0，不顯示於地圖/列表
}

export interface OptimizeRequest {
  activities: ActivityInput[];
  mode: TransportMode;
  start_time: string; // "HH:MM"
  end_time: string;   // "HH:MM"
  date?: string;      // "YYYY-MM-DD" 僅 full 版需要
}

export interface OptimizeResult {
  order: string[];                // activity IDs 排序後
  travel_times_minutes: number[]; // 每段行駛分鐘
  start_times: string[];          // 每個活動實際開始時間 "HH:MM"（與 order 對應）
}

export interface EnrichedActivity {
  id: string;
  place_id?: string;
  lat: number;
  lng: number;
  rating?: number;
  opening_hours?: Record<string, unknown>; // Google raw format
}

export interface FullOptimizeResult extends OptimizeResult {
  enriched_activities: EnrichedActivity[];
}
