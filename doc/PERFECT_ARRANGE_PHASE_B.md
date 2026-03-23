# 完美安排 — 方案 B 規格（佔位符 + 附近餐廳推薦）

## 背景

### 現行方案的限制

目前流程：Gemini 生成完整行程（景點 + 餐廳一起）→ 路線優化。

**問題：** Gemini 在不知道最終路線的情況下猜測餐廳位置。即使優化器把餐廳排在對的時間，位置仍可能與路線背道而馳。若行程中完全不含餐廳，優化器不會預留用餐時間，導致景點排得太密、吃飯時間點附近的景點位置失真。

---

## 方案 B：佔位符 + 兩次優化

### 核心概念

1. LLM **不主動生成餐廳**（除非用戶明確指定）
2. 第一次優化加入**距離全 0 的佔位符**，純粹保留用餐時段
3. 路線確定後，根據用餐時段前後景點的**中點座標**搜尋附近真實餐廳
4. 用戶從 3 間候選中選定後，**替換佔位符為真實餐廳**，再做第二次優化

### 流程

```text
LLM 生成景點（不含餐廳，除非用戶已指定）

↓

第一次優化（含佔位符）
├─ 自動插入午餐佔位符（若行程跨越 11:00–14:00）
├─ 自動插入晚餐佔位符（若行程跨越 17:30–21:00）
├─ 佔位符距離矩陣全設 0（不影響路線成本）
├─ 佔位符 service time：午餐 90 分鐘、晚餐 120 分鐘
├─ 佔位符時間窗：午餐 11:00–14:00、晚餐 17:30–21:00
└─ 得到景點排序 + 佔位符在路線中的位置

↓

計算餐廳搜尋座標
├─ 取佔位符前一個景點（A）與後一個景點（B）
└─ 搜尋中心 = A 與 B 的中點座標

↓

Nearby Search（前端呼叫 /api/places-nearby）
└─ 回傳 3 間候選餐廳（評分最高）

↓

用戶選擇餐廳

↓

第二次優化（含真實餐廳座標）
├─ 替換佔位符為真實 Activity（有名稱、座標、opening_hours）
└─ 重新優化，得到最終路線
```

### 佔位符的插入條件

| 條件 | 行為 |
| ---- | ---- |
| 用戶已指定餐廳（`flexible: false`） | 不插入佔位符，走現有流程 |
| 行程時段涵蓋午餐時段 | 插入午餐佔位符 |
| 行程時段涵蓋晚餐時段 | 插入晚餐佔位符 |
| 偏遠地區 Nearby Search 無結果 | 退回方案 A（保留 Gemini 建議，若有） |

### 搜尋中心座標計算

```text
前一景點 A：(latA, lngA)，預計離開時間 tA
後一景點 B：(latB, lngB)，預計抵達時間 tB

搜尋中心 = ((latA + latB) / 2, (lngA + lngB) / 2)
```

> 不用前一景點的座標，是因為 Vroom 知道佔位符距離為 0，可能將較遠的景點排在其前方。取中點才能保證餐廳在真實路途中間。

---

## API 設計

### 現有 API（不變）

`POST /api/optimize-route` 和 `POST /api/optimize-route-full` 維持不變，佔位符視為一般 activity 處理（距離矩陣由 orchestrator 特殊處理）。

### 新增 API Route

`POST /api/places-nearby`：

```typescript
// Request
{
  lat: number
  lng: number
  radius: number          // 午餐 500m、晚餐 800m，無結果時擴大至 1500m
  keyword?: string        // 從 user preferences 解析（「日式」、「素食」等）
}

// Response
{
  restaurants: Array<{
    place_id: string
    name: string
    lat: number
    lng: number
    rating?: number
    opening_hours?: Record<string, unknown>
  }>
}
```

### 佔位符的 Activity 結構

```typescript
// 插入 Vroom 前的佔位符（store.ts 產生）
{
  id: "meal-placeholder-lunch" | "meal-placeholder-dinner",
  title: "午餐" | "晚餐",
  type: "lunch" | "dinner",
  duration_minutes: 90 | 120,
  time: "12:00" | "18:30",   // 時段中間值，供 UI 顯示用
  location: { name: "午餐" | "晚餐" },  // 無 lat/lng
  order: <插入位置>,
  isMealPlaceholder: true,   // 標記，供地圖/列表隱藏用
}
```

地圖與活動列表：`isMealPlaceholder: true` 的項目**不顯示 pin、不顯示於列表**。

### 前端流程（store.ts）

```typescript
// optimizeDayWithMealSearch(dayNumber)
1. 過濾出用餐佔位符需要插入的時段
2. 在 activities 中插入佔位符（距離矩陣設為 0）
3. 呼叫 /api/optimize-route，取得含佔位符的排序 + start_times
4. 找出佔位符前後景點，計算中點座標
5. 呼叫 /api/places-nearby，取得 3 間候選
6. 前端顯示餐廳選擇 UI（Modal 或側邊欄）
7. 用戶選定後：
   a. 替換佔位符為真實 Activity（place_id、lat、lng、opening_hours）
   b. 再呼叫一次 /api/optimize-route-full
   c. 存回 Supabase
```

---

## 需新增 / 修改的檔案

| 檔案 | 變更 |
|------|------|
| `app/api/places-nearby/route.ts` | 新增，呼叫 Google Places Nearby Search |
| `lib/route-optimization/orchestrator.ts` | 偵測 `isMealPlaceholder`，距離矩陣該欄位設 0 |
| `components/planner/itinerary/store.ts` | 新增 `optimizeDayWithMealSearch`，插入佔位符、處理餐廳選擇 |
| `components/planner/` | 新增餐廳選擇 UI 元件 |
| `supabase/functions/generate-itinerary/` | 調整 prompt：未指定餐廳時不生成，改由前端佔位 |

---

## 注意事項

1. **Google Places Nearby Search 費用**：每次 $0.032，每天一個行程約 2 次（午晚各一），有快取可降低重複費用。

2. **搜尋半徑策略**：先用 500m（午餐）/ 800m（晚餐），無結果時自動擴大至 1500m。

3. **第二次優化觸發時機**：用戶選完餐廳後立即觸發，不需用戶手動按優化。

4. **多天行程**：每天獨立判斷是否插入佔位符，不互相影響。

---

## 與現行方案的差異對比

| | 方案 A（現行） | 方案 B |
| - | ----------- | ------ |
| 餐廳來源 | Gemini 猜測 | Google Places 實際資料 |
| 餐廳位置 | 路線優化後可能偏離 | 保證在路線途中附近 |
| 用餐時間保留 | 依 Gemini 安排 | 佔位符強制保留 |
| API 呼叫 | 0 次 | +2 次 Nearby Search / 天 |
| 實作複雜度 | 低 | 中 |
| 用戶介入 | 無 | 選餐廳（1 次互動） |
| 用戶指定餐廳 | 支援（flexible: false） | 支援（跳過佔位符） |
