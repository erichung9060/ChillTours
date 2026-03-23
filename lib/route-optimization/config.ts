/**
 * 路線優化全域設定
 * 修改此檔案即可調整所有預設行為，無需碰其他模組。
 */

/** 每天預設出發時間（若使用者未設定每日時間窗口） */
export const DEFAULT_DAY_START = "09:00";

/** 每天預設結束時間（若使用者未設定每日時間窗口） */
export const DEFAULT_DAY_END = "21:00";

/** 用餐硬性時段 — Vroom time_windows 與 greedy start-time 均依此執行 */
export const MEAL_WINDOWS: Record<string, { open: string; close: string }> = {
  breakfast: { open: "07:00", close: "10:00" },
  lunch:     { open: "11:00", close: "14:00" },
  dinner:    { open: "17:30", close: "21:00" },
};
