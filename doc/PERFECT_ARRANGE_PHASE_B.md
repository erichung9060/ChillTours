# 完美安排 — 方案 B 規格（兩段式路線優化 + 附近餐廳插入）

## 背景

### 現行方案（A + C）的限制

目前「完美安排」的流程：
1. Gemini 生成完整行程（景點 + 餐廳一起）
2. OR-Tools 對全天活動做 TSP，餐廳透過 soft time window（午餐 11:00-14:00，晚餐 17:30-21:00）約束時間

**問題：** Gemini 在不知道最終路線的情況下猜測餐廳位置，餐廳可能與最佳化後的路線方向相反，OR-Tools 只能確保餐廳在「對的時間」，無法保證「對的地方」。

---

## 方案 B：兩段式優化

### 概念

先跑景點的 TSP，確定路線後，再根據路線中對應時段的「當下地理位置」搜尋附近餐廳插入。

### 流程

```
Phase 1：景點優化
├─ 過濾掉所有 type = lunch/dinner/breakfast 的活動
├─ 對剩下的景點跑 OR-Tools（快速 TSP）
└─ 得到排序後的景點列表 + 各活動的預計到達時間

Phase 2：插入餐廳
├─ 午餐時段（11:00-14:00）：
│   ├─ 找到預計時間最接近 12:00 的景點
│   ├─ 取得該景點的 lat/lng
│   ├─ 呼叫 Google Places Nearby Search：
│   │   type=restaurant, radius=500m, rankby=rating
│   └─ 選評分最高的餐廳插入到景點後面
│
└─ 晚餐時段（17:30-21:00）：
    ├─ 找到當天最後一個景點（或預計時間最接近 18:00 的景點）
    ├─ 取得該景點的 lat/lng
    ├─ 呼叫 Google Places Nearby Search：
    │   type=restaurant, radius=800m, rankby=rating
    └─ 選評分最高的餐廳插入到景點後面
```

### Phase 2 的資料補充

從 Places API 取得餐廳後，需要補充：
- `title`：餐廳名稱
- `location.lat/lng`：精確座標
- `location.place_id`：Places API 回傳
- `opening_hours`：從 Places API 的 `opening_hours.periods` 解析當天時段
- `type`：`"lunch"` 或 `"dinner"`
- `flexible`：`true`（位置雖然由 API 決定，時間仍可在時段內微調）
- `duration_minutes`：預設 60 分鐘

---

## API 設計

### 新增 Python 端點

`POST /optimize/perfect`

```python
class PerfectOptimizeRequest(BaseModel):
    activities: List[ActivityInput]   # 只含景點（不含餐廳）
    date: str                         # "YYYY-MM-DD"，用於判斷星期幾
    mode: str = "driving"
    start_time: str = "09:00"
    end_time: str = "20:00"

class InsertedMeal(BaseModel):
    type: str                         # "lunch" | "dinner"
    insert_after_id: str              # 插入在哪個景點後面
    search_lat: float
    search_lng: float
    scheduled_time: str               # 預計用餐時間 "HH:MM"

class PerfectOptimizeResponse(BaseModel):
    order: List[str]                  # 景點排序（不含餐廳）
    travel_times_minutes: List[int]
    meal_inserts: List[InsertedMeal]  # 告訴前端去哪裡搜尋餐廳
```

### 前端處理流程

```typescript
// autoOptimizeAllDays（完美模式）
1. 過濾掉餐廳活動，只傳景點給 /optimize/perfect
2. 收到 meal_inserts → 對每個 insert，呼叫 /api/places-nearby
3. 從結果選第一個（評分最高）轉換成 Activity 物件
4. 將餐廳插入到指定景點後面
5. 重新計算全天時間序列
6. 存回 Supabase
```

### 新增 Next.js API Route

`POST /api/optimize-route-perfect`：代理到 Python `/optimize/perfect`

`POST /api/places-nearby`：

```typescript
// 呼叫 Google Places Nearby Search
{
  lat: number,
  lng: number,
  type: "restaurant",
  radius: number,
  keyword?: string  // 可選：料理類型
}
// 回傳前 5 筆，含 name, place_id, lat, lng, rating, opening_hours
```

---

## 需修改的檔案

| 檔案 | 變更 |
| ---- | ---- |
| `python/main.py` | 新增 `PerfectOptimizeRequest/Response`、`POST /optimize/perfect` 端點 |
| `app/api/optimize-route-perfect/route.ts` | 新增，代理到 Python |
| `app/api/places-nearby/route.ts` | 新增，呼叫 Google Places Nearby Search API |
| `components/planner/itinerary/store.ts` | `autoOptimizeAllDays` 在 perfect 模式下改用新流程 |

---

## 注意事項

1. **Google Places API 費用**：Nearby Search 每次 $0.032，每天一個行程約呼叫 2 次（午晚餐各一）。可考慮快取到 Supabase。

2. **餐廳已被 Gemini 生成時**：若使用者 preferences 指定餐廳（`flexible: false`），Phase 2 跳過該時段，保留使用者指定的餐廳。

3. **找不到餐廳時的 fallback**：Places API 若無結果（偏遠地區），退回方案 A 的邏輯（保留 Gemini 建議的餐廳）。

4. **搜尋半徑**：午餐 500m（通常在景點密集區），晚餐 800m（可接受稍遠）。若無結果可擴大到 1500m。

5. **餐廳類型篩選**：可從使用者 preferences 解析關鍵字（「日式料理」、「素食」等）作為 `keyword` 參數傳入。

---

## 與現行方案的差異對比

| | 方案 A（現行） | 方案 B |
| -- | ----------- | ------ |
| 餐廳來源 | Gemini 猜測 | Google Places 實際資料 |
| 餐廳位置 | 路線優化後可能偏離 | 保證在路線途中附近 |
| API 呼叫 | 0 次（Pure TSP） | +2 次 Places API / 天 |
| 實作複雜度 | 低 | 中 |
| 使用者指定餐廳 | 支援（flexible: false） | 支援（跳過對應時段） |
