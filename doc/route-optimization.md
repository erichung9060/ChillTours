# 路線優化系統說明

> 實作：`lib/route-optimization/`（TypeScript，Next.js server-side）

---

## 整體架構

```
前端按鈕
  ├─ 快速優化 → POST /api/optimize-route      → orchestrator.ts
  │                                               ├─ Google Distance Matrix（距離矩陣）
  │                                               └─ ORS Vroom / Greedy fallback
  │
  └─ 完整優化 → POST /api/optimize-route-full → orchestrator.ts
                                                  ├─ places.ts（Google Places 豐富化）
                                                  │    ├─ Find Place Text Search（精確座標）
                                                  │    ├─ Place Details（當天營業時間）
                                                  │    └─ 快取至 google_places 表（Supabase）
                                                  ├─ Google Distance Matrix（距離矩陣）
                                                  │    └─ 座標偏移 >0.001° 才重建
                                                  └─ ORS Vroom（含時間窗）/ Greedy fallback
```

### 關鍵檔案

| 檔案 | 職責 |
|------|------|
| `orchestrator.ts` | 入口，協調 enrichment + matrix + solver |
| `vroom.ts` | 呼叫 ORS Vroom API，處理時間窗、回傳 start_times |
| `greedy.ts` | Vroom 失敗時的 fallback，時間窗感知 greedy |
| `distance-matrix.ts` | Google Distance Matrix API，失敗時 Haversine |
| `places.ts` | Google Places 豐富化（精確座標 + 營業時間） |
| `config.ts` | 預設常數（DEFAULT_DAY_START、MEAL_WINDOWS 等） |
| `types.ts` | 所有 interface / type 定義 |

---

## 回傳格式

```typescript
// 快速優化
OptimizeResult {
  order: string[]               // activity ID 排序
  travel_times_minutes: number[] // 相鄰活動間行駛分鐘
  start_times: string[]         // 每個活動的開始時間 "HH:MM"
}

// 完整優化（額外包含豐富化結果）
FullOptimizeResult extends OptimizeResult {
  enriched_activities: EnrichedActivity[]  // 含精確座標、place_id、opening_hours
}
```

---

## 距離矩陣

### 主要：Google Maps Distance Matrix API

- 單次 N×N API call（N 個景點 = 1 次請求）
- 回傳真實路況時間（秒 → 轉分鐘）

### 備用（API 失敗時）：Haversine 公式

- 直線距離 ÷ 預設速度，不考慮路況

### 交通方式（`mode` 參數）

| mode | 說明 | Haversine 備用速度 |
|------|------|--------------------|
| `driving` | 開車（預設） | 40 km/h |
| `walking` | 步行 | 4 km/h |
| `transit` | 大眾運輸 | 20 km/h |
| `bicycling` | 自行車 | 15 km/h |

---

## ORS Vroom 求解器

呼叫 [ORS Optimization API](https://openrouteservice.org/dev/#/api-docs/optimization)（Vroom）：

- 每個 activity 轉為 Vroom `job`，`service` = `duration_minutes * 60`
- 有 `opening_hours` → 設 `time_windows`
- 有 `type`（lunch/dinner/breakfast）→ 使用 `MEAL_WINDOWS` 預設時段
- Vehicle `time_window` = `[start_time, end_time]`（秒）

### start_times 計算

Vroom 回傳每個 step 的 `arrival`（秒），加上 `waiting_time` 得到實際開始時間：

```
start_time = arrival + waiting_time
```

Vroom 會自動延遲出發時間以減少等待（例如晚餐前刻意晚出發）。

### 未排入活動（unassigned）

Vroom 若判斷某活動時間窗不可行，會列入 `unassigned`。store.ts 只取 `order` 陣列重排，未列入者自動從當日行程移除。

---

## 三層降級策略

### Layer 1：ORS Vroom（主要）

呼叫 ORS API，完整 TSP with Time Windows 求解。

### Layer 2：Greedy fallback（Vroom 失敗時）

時間窗感知 greedy：

```
有 opening_hours → 等到開門才服務
有 meal type    → 等到用餐時段才服務
flexible=false  → 固定在指定時間
每步選「總等待+移動成本最低」的下一個景點
```

start_times 由 greedy 沿路累計時間計算，邏輯與 Vroom 一致。

### n ≤ 1

直接回傳原始順序，不呼叫任何 API。

---

## 時間窗約束（完整優化）

由 `places.ts` 從 Google Places `regularOpeningHours` 提取當日時段：

```text
period.open.hour:minute → "HH:MM"
period.close.hour:minute → "HH:MM"（無 close 則為 "23:59"）
```

用餐預設時段（`config.ts`）：

| type      | open  | close |
|-----------|-------|-------|
| breakfast | 07:00 | 10:00 |
| lunch     | 11:00 | 14:00 |
| dinner    | 17:30 | 21:00 |

---

## 完整優化額外步驟（places.ts）

1. **Find Place Text Search**：用景點名稱 + 原始座標搜尋，取得 `place_id`
2. **Cache 查詢**：`google_places` 表命中則直接回傳，不重複呼叫 API
3. **Place Details**：取精確座標、評分、`regularOpeningHours`
4. **Cache 寫入**：結果存入 `google_places` 表供下次使用

若座標偏移 > 0.001°（約 100m），重建距離矩陣。

```
總時間估計（無快取，N 個景點）：
  ≈ N × 0.7s（Places API）+ 0.5s（Distance Matrix）+ Vroom
  N=5：≈ 4.5s

有快取後 Places 跳過，接近快速優化時間（~1-3s）。
```

---

## 預設常數（config.ts）

```typescript
DEFAULT_DAY_START = "09:00"
DEFAULT_DAY_END   = "21:00"
MEAL_WINDOWS = {
  breakfast: { open: "07:00", close: "10:00" },
  lunch:     { open: "11:00", close: "14:00" },
  dinner:    { open: "17:30", close: "21:00" },
}
```
