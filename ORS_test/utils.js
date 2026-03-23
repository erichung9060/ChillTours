/**
 * 共用工具：讀取 .env.local、Haversine、格式化輸出
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 讀取 .env.local（專案根目錄）
function loadEnv() {
  const envPath = resolve(__dirname, "../.env.local");
  try {
    const lines = readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !(key in process.env)) process.env[key] = val;
    }
  } catch {
    console.warn("⚠ 找不到 .env.local，使用系統環境變數");
  }
}

loadEnv();

export const ORS_API_KEY = process.env.ORS_API_KEY;
export const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
export const API_GATEWAY_SECRET = process.env.API_GATEWAY_SECRET;
export const NEXT_APP_URL = process.env.NEXT_APP_URL ?? "http://localhost:3000";

export function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function haversineMinutes(lat1, lng1, lat2, lng2, speedKmh = 40) {
  return Math.max(1, Math.round((haversineMeters(lat1, lng1, lat2, lng2) / 1000 / speedKmh) * 60));
}

export function hhmmToSeconds(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h * 60 + m) * 60;
}

export function divider(char = "=", width = 60) {
  return char.repeat(width);
}
