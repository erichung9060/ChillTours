# Itinerary Activity 資料流分析

## 概述

本文件詳細分析 TripAI 應用程式中 Itinerary Activity 的完整資料流，從前端 Schema 定義、UI 元件、狀態管理，到後端 Supabase Edge Function 的 AI 生成流程。

---

## 1. 資料結構定義 (Schema)

### 1.1 前端 TypeScript Schema (`types/itinerary.ts`)

使用 Zod 進行執行時驗證和型別推導：

```typescript
// Location Schema
LocationSchema = {
  name: string (必填, 最少1字元)
  lat: number (可選, -90~90, 預設0)
  lng: number (可選, -180~180, 預設0)
  place_id: string (可選)
}

// Activity Schema
ActivitySchema = {
  id: uuid (必填)
  time: string (必填, HH:MM 格式, 24小時制)
  title: string (必填, 1-100字元)
  description: string (最多500字元)
  location: LocationSchema (必填)
  duration_minutes: number (必填, 15-480分鐘)
  order: number (必填, >=0, 用於排序)
  url: string (可選, 外部連結)
}

// Day Schema
DaySchema = {
  day_number: number (必填, 1-30)
  date: string (必填, YYYY-MM-DD 格式)
  activities: Activity[] (活動陣列)
}

// Itinerary Schema
ItinerarySchema = {
  id: uuid
  user_id: uuid
  title: string (1-100字元)
  destination: string (1-100字元)
  start_date: string (YYYY-MM-DD)
  end_date: string (YYYY-MM-DD, 必須 >= start_date)
  preferences: string (可選, 使用者自訂偏好)
  status: "draft" | "generating" | "completed" | "failed"
  days: Day[]
  created_at: ISO datetime
  updated_at: ISO datetime
}
```

**驗證規則：**
- 時間格式嚴格驗證 (HH:MM)
- 座標範圍檢查 (緯度 -90~90, 經度 -180~180)
- 日期邏輯驗證 (end_date >= start_date)
- 字串長度限制 (防止過長輸入)

### 1.2 資料庫 Schema (`lib/supabase/database.types.ts`)

```typescript
itineraries Table:
{
  id: string (UUID, Primary Key)
  user_id: string (UUID, Foreign Key to profiles)
  title: string
  destination: string
  start_date: string
  end_date: string
  preferences: string | null
  status: "draft" | "generating" | "completed" | "failed"
  data: Json | null  // 儲存 { days: Day[] }
  created_at: string (ISO timestamp)
  updated_at: string (ISO timestamp)
}
```

**重要設計決策：**
- `data` 欄位使用 JSONB 型別儲存完整的 days 陣列
- 支援 RLS (Row Level Security) 確保使用者只能存取自己的行程
- `status` 欄位追蹤生成狀態，支援並發控制

---

## 2. 後端 AI 生成流程

### 2.1 Edge Function: `generate-itinerary` 

**檔案位置：** `supabase/functions/generate-itinerary/index.ts`

#### 流程步驟：

1. **驗證與授權**
   ```typescript
   - 驗證使用者身份 (JWT token)
   - 檢查 itinerary_id 是否存在
   - 透過 RLS 確認使用者擁有該行程
   ```

2. **並發控制 (Concurrency Guard)**
   ```typescript
   // 原子性更新：只允許從 draft/failed 轉換到 generating
   UPDATE itineraries 
   SET status = 'generating'
   WHERE id = itinerary_id 
     AND (status = 'draft' OR status = 'failed' OR status IS NULL)
   
   // 如果更新失敗，檢查當前狀態並回傳適當錯誤：
   - ALREADY_GENERATING (409)
   - ALREADY_COMPLETED (409)
   ```

3. **建構 AI Prompt**
   ```typescript
   buildItineraryPrompt(destination, startDate, endDate, preferences)
   
   Prompt 包含：
   - 旅遊天數計算
   - 目的地資訊
   - 日期範圍
   - 自訂需求 (可選)
   - JSON 格式規範
   - 每天 3-5 個活動
   - 24小時制時間格式
   - GPS 座標要求
   - 活動時長 60-240 分鐘
   ```

4. **串流生成 (Streaming Generation)**
   ```typescript
   使用 @streamparser/json 進行增量解析：
   
   - JSONPath: "$.itinerary.*.activities.*"
   - 每當解析到完整的 activity 物件時觸發 onValue
   - 即時發送 SSE (Server-Sent Events) 給前端
   - 同時累積資料準備儲存到資料庫
   ```

5. **Activity 處理**
   ```typescript
   parser.onValue = ({ value, stack }) => {
     // 從 JSONPath stack 提取 day_number
     const dayIndex = stack[2].key  // 0-based
     const day_number = dayIndex + 1  // 轉換為 1-based
     
     // 計算日期 (使用 UTC 避免時區問題)
     const [year, month, day] = startDate.split("-").map(Number)
     const dateObj = new Date(Date.UTC(year, month - 1, day))
     dateObj.setUTCDate(dateObj.getUTCDate() + dayIndex)
     const date = dateObj.toISOString().split("T")[0]
     
     // 新增 UUID 和 order
     const activityWithId = {
       ...activity,
       id: crypto.randomUUID(),
       order: dayMap.get(day_number)?.activities.length ?? 0
     }
     
     // 發送 SSE 事件
     emitSSE("activity", { day_number, activity: activityWithId })
     
     // 累積到 dayMap
     dayMap.set(day_number, { day_number, date, activities: [...] })
   }
   ```

6. **完成與儲存**
   ```typescript
   // 串流結束後
   const allDays = Array.from(dayMap.values())
     .sort((a, b) => a.day_number - b.day_number)
   
   // 更新資料庫
   UPDATE itineraries
   SET status = 'completed',
       data = { days: allDays }
   WHERE id = itinerary_id
   
   // 發送完成事件
   emitSSE("complete", {})
   ```

7. **錯誤處理**
   ```typescript
   try-catch 包裹整個流程：
   - 串流錯誤 → status = 'failed'
   - 資料庫錯誤 → status = 'failed'
   - 客戶端斷線 → 背景繼續生成
   ```

**SSE 事件格式：**
```typescript
event: activity
data: {"day_number": 1, "activity": {...}}

event: complete
data: {}

event: error
data: {"message": "Error description"}
```

---

## 3. 前端狀態管理

### 3.1 Zustand Store (`components/planner/itinerary/store.ts`)

**核心狀態：**
```typescript
{
  // 資料狀態
  itinerary: Itinerary | null
  isLoading: boolean
  error: string | null
  
  // 生成狀態
  isGenerating: boolean
  generationAbortController: AbortController | null
  pollingIntervalId: ReturnType<typeof setInterval> | null
  
  // 互動狀態
  crossDayDragInfo: {...} | null  // 跨天拖曳資訊
  draggingActivityId: string | null
  hoveredDayNumber: number | null
  hoveredActivityId: string | null
}
```

**關鍵 Actions：**

1. **fetchItinerary** - 從資料庫載入行程
   ```typescript
   - 呼叫 loadItinerary(id)
   - 設定 isLoading 狀態
   - 錯誤處理
   ```

2. **startStreaming** - 開始 AI 生成
   ```typescript
   - 並發控制：中止現有的 AbortController
   - 建立新的 AbortController
   - 呼叫 aiClient.streamItinerary()
   - 處理三種回調：
     * onActivity: 呼叫 addActivity()
     * onComplete: 呼叫 completeGeneration()
     * onError: 設定錯誤狀態
   - 特殊處理：ALREADY_GENERATING → 切換到 Polling 模式
   ```

3. **addActivity** - 增量新增活動
   ```typescript
   - 找到或建立對應的 day
   - 如果 day 不存在，計算日期並建立新 day
   - 將 activity 加入 activities 陣列
   - 重新排序 days (按 day_number)
   - 更新 updated_at 時間戳
   ```

4. **startPolling** - 輪詢模式 (Fallback)
   ```typescript
   - 用於處理 ALREADY_GENERATING 情況
   - 每 3 秒輪詢一次資料庫
   - 最多嘗試 100 次 (~5 分鐘)
   - 狀態檢查：
     * completed → 停止輪詢，更新 itinerary
     * failed → 停止輪詢，顯示錯誤
     * generating → 繼續輪詢
   ```

5. **updateActivity** - 更新單一活動
   ```typescript
   - 遍歷所有 days 和 activities
   - 根據 activity.id 找到目標活動
   - 替換為更新後的活動
   - 更新 updated_at 時間戳
   ```

6. **applyOperations** - 套用 AI 操作
   ```typescript
   - 呼叫 lib/ai/operations.ts 的 applyOperations()
   - 支援 5 種操作類型：ADD, REMOVE, UPDATE, MOVE, REORDER
   - 自動處理地理編碼 (geocoding)
   - 更新 updated_at 時間戳
   ```

---

## 4. AI 操作系統 (Operations)

### 4.1 操作類型 (`lib/ai/operations.ts`)

**設計理念：** 不直接替換整個 day，而是透過細粒度操作修改行程

#### 1. ADD - 新增活動
```typescript
{
  type: "ADD",
  day_number: 2,
  activity: {
    time: "14:00",
    title: "Tokyo Tower",
    description: "Visit the iconic tower",
    location: { name: "Tokyo Tower", lat: 35.6586, lng: 139.7454 },
    duration_minutes: 90,
    insert_at: 2  // 可選，0-based 索引
  }
}

處理邏輯：
- 確保 day 存在 (不存在則建立)
- 呼叫 ensureLocationData() 確保座標有效
- 生成 UUID
- 插入到指定位置或附加到最後
- 重新計算所有 activity 的 order
```

#### 2. REMOVE - 移除活動或整天
```typescript
{
  type: "REMOVE",
  day_number: 1,
  activity_index: 1  // 可選，0-based 索引
}

處理邏輯：
- 如果 activity_index 未提供 → 移除整個 day
  * 重新編號剩餘的 days
  * 重新計算日期
  * 更新 end_date
- 如果 activity_index 提供 → 移除特定活動
  * 從 activities 陣列中移除
  * 重新計算 order
```

#### 3. UPDATE - 更新活動
```typescript
{
  type: "UPDATE",
  day_number: 3,
  activity_index: 0,  // 0-based 索引
  changes: {
    time: "15:00",
    title: "Updated Title",
    location: { name: "New Location" }  // 可選提供座標
  }
}

處理邏輯：
- 找到目標活動 (day_number + activity_index)
- 套用簡單欄位變更 (time, title, description, duration_minutes)
- 如果 location 變更：
  * 呼叫 ensureLocationData()
  * 如果 LLM 未提供座標，自動進行地理編碼
```

#### 4. MOVE - 移動活動到另一天
```typescript
{
  type: "MOVE",
  from_day_number: 2,
  from_activity_index: 2,  // 0-based 索引
  to_day_number: 3,
  insert_at: 0  // 可選，0-based 索引
}

處理邏輯：
- 確保目標 day 存在
- 從來源 day 移除活動
- 插入到目標 day 的指定位置
- 重新計算兩個 day 的 order
```

#### 5. REORDER - 重新排序活動
```typescript
{
  type: "REORDER",
  day_number: 1,
  activity_order: [1, 0, 2]  // 0-based 索引陣列
}

處理邏輯：
- 驗證索引陣列長度與活動數量一致
- 根據索引陣列重新排列活動
- 重新計算 order
```

### 4.2 地理編碼整合 (`lib/maps/geocoding.ts`)

```typescript
ensureLocationData(partialLocation: PartialLocation): Promise<Location>

功能：
- 如果 lat/lng 已提供且有效 → 直接使用
- 如果座標缺失或無效 → 呼叫地理編碼 API
- 支援 Google Maps 和 Mapbox 兩種提供商
- 快取結果避免重複查詢
```

---

## 5. 前端 UI 元件

### 5.1 ActivityCard (`components/planner/itinerary/components/activity-card.tsx`)

**功能：**
- 顯示活動資訊 (時間、標題、地點、描述、時長)
- 支援滑鼠懸停效果 (onMouseEnter/onMouseLeave)
- 整合地圖導航 (Google Maps 連結)
- 外部連結按鈕 (activity.url)
- 編輯按鈕 (開啟 EditActivityDialog)

**UI 結構：**
```
Card
├── ExternalLink Button (右上角, hover 顯示)
├── Edit Button (右下角, hover 顯示)
└── CardContent
    ├── Time Badge (主色調背景)
    ├── Title (粗體)
    ├── Location (Google Maps 圖示 + 可點擊)
    ├── Description (最多2行, line-clamp-2)
    └── Duration (時鐘圖示 + 分鐘數)
```

**互動行為：**
```typescript
- 點擊 Location → 開啟 Google Maps 導航
- 點擊 ExternalLink → 開啟 activity.url 或 Google Maps
- 點擊 Edit → 開啟編輯對話框
- 滑鼠懸停 → 觸發 onMouseEnter (用於地圖標記高亮)
```

### 5.2 EditActivityDialog (`components/planner/itinerary/components/edit-activity-dialog.tsx`)

**功能：**
- 編輯活動的所有欄位
- 表單驗證
- 自動聚焦到 Title 欄位
- 儲存後呼叫 onSave 回調

**表單欄位：**
```typescript
1. Title (Input)
2. Location Name (Input)
3. Time (Input type="time")
4. Duration (Input type="number")
5. URL (Input, placeholder="https://...")
6. Description (Textarea)
```

**儲存邏輯：**
```typescript
handleSave = () => {
  const updatedActivity: Activity = {
    ...activity,  // 保留 id, order, location.lat/lng
    title: formData.title,
    location: {
      ...activity.location,
      name: formData.locationName  // 只更新名稱
    },
    description: formData.description,
    time: formData.time,
    duration_minutes: Number(formData.duration),
    url: formData.url || undefined
  }
  
  onSave(updatedActivity)  // 呼叫 store.updateActivity()
  onClose()
}
```

**注意事項：**
- 不支援直接編輯座標 (lat/lng)
- 如果需要更新座標，應透過 Chat 使用 UPDATE 操作
- 保留原始的 id 和 order

---

## 6. Chat 整合

### 6.1 Chat Edge Function (`supabase/functions/chat/index.ts`)

**功能：**
- 接收使用者訊息和對話歷史
- 接收完整的 itinerary_context
- 使用 Gemini AI 生成回應
- 支援串流回應
- 自動偵測是否需要修改行程

**Prompt 結構：**
```typescript
1. 系統角色定義
2. Itinerary Context (如果提供)
   - 標題、目的地、日期範圍
   - 每天的活動列表 (包含 0-based 索引)
3. 行為規則
   - 如果需要修改行程 → 回應 + JSON 操作
   - 如果不需要修改 → 純文字回應
4. 操作格式說明
   - 5 種操作類型的詳細規範
   - 0-based 索引說明
   - 範例
5. 重要限制
   - 不能修改 metadata (title, destination, dates)
   - 必須使用 UI 控制項修改 metadata
```

**回應格式：**
```
自然語言解釋...

ITINERARY_OPERATIONS:
{
  "operations": [...]
}
```

### 6.2 Chat Hook (`hooks/use-itinerary-chat.ts`)

**功能：**
- 管理每個行程的獨立聊天歷史
- LocalStorage 持久化
- 跨分頁同步
- 自動儲存

**Storage Key 格式：**
```typescript
`tripai:chat:${itineraryId}`
```

**API：**
```typescript
{
  messages: ChatMessage[]
  addMessage: (message: ChatMessage) => void
  clearMessages: () => void
}
```

**訊息格式：**
```typescript
ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
}
```

---

## 7. 完整資料流圖

### 7.1 初始生成流程

```
使用者提交表單
    ↓
建立 itinerary metadata (status: draft)
    ↓
呼叫 generate-itinerary Edge Function
    ↓
並發控制：draft → generating
    ↓
建構 AI Prompt
    ↓
Gemini AI 串流生成
    ↓
JSONParser 增量解析
    ↓
每個 activity 解析完成
    ↓
發送 SSE 事件 → 前端
    ↓
前端 store.addActivity()
    ↓
UI 即時更新 (ActivityCard 渲染)
    ↓
所有活動生成完成
    ↓
儲存到資料庫 (status: completed)
    ↓
發送 complete 事件
    ↓
前端 completeGeneration()
```

### 7.2 Chat 修改流程

```
使用者在 Chat 輸入訊息
    ↓
前端收集 itinerary_context
    ↓
呼叫 chat Edge Function
    ↓
Gemini AI 分析意圖
    ↓
生成回應 + ITINERARY_OPERATIONS JSON
    ↓
前端解析 JSON
    ↓
呼叫 store.applyOperations()
    ↓
lib/ai/operations.ts 處理操作
    ↓
ensureLocationData() 地理編碼 (如需要)
    ↓
更新 store.itinerary
    ↓
UI 自動重新渲染
    ↓
(可選) 儲存到資料庫
```

### 7.3 手動編輯流程

```
使用者點擊 ActivityCard 的編輯按鈕
    ↓
開啟 EditActivityDialog
    ↓
使用者修改欄位
    ↓
點擊 Save
    ↓
呼叫 store.updateActivity()
    ↓
遍歷 days 找到目標 activity
    ↓
替換為更新後的 activity
    ↓
更新 updated_at
    ↓
UI 自動重新渲染
    ↓
(可選) 儲存到資料庫
```

---

## 8. 關鍵設計決策

### 8.1 索引系統

**問題：** LLM 和人類對索引的理解不同

**解決方案：**
- 內部使用 0-based 索引 (符合程式慣例)
- Prompt 中明確說明 "Activity indices are 0-based"
- 範例中展示 [0], [1], [2] 的標記方式

### 8.2 並發控制

**問題：** 多個請求同時觸發生成

**解決方案：**
- 資料庫層級：原子性條件更新
- 前端層級：AbortController 中止舊請求
- Fallback：Polling 模式處理 ALREADY_GENERATING

### 8.3 時區處理

**問題：** 日期計算受時區影響

**解決方案：**
```typescript
// 使用 Date.UTC 明確指定 UTC 時區
const [year, month, day] = startDate.split("-").map(Number)
const dateObj = new Date(Date.UTC(year, month - 1, day))
dateObj.setUTCDate(dateObj.getUTCDate() + dayIndex)
```

### 8.4 地理編碼策略

**問題：** LLM 可能提供不準確的座標

**解決方案：**
- LLM 可選擇性提供座標
- 如果座標缺失或無效，自動呼叫地理編碼 API
- 支援多個地圖提供商 (Google Maps, Mapbox)

### 8.5 錯誤恢復

**問題：** 生成過程中可能失敗

**解決方案：**
- status 欄位追蹤狀態
- failed 狀態允許重新生成
- 客戶端斷線不影響背景生成
- Polling 模式作為 Fallback

---

## 9. 資料驗證層級

### Level 1: TypeScript 型別檢查 (編譯時)
```typescript
- 靜態型別檢查
- IDE 自動完成
- 重構安全
```

### Level 2: Zod Schema 驗證 (執行時)
```typescript
- 格式驗證 (時間、日期、座標)
- 範圍檢查 (字串長度、數值範圍)
- 邏輯驗證 (end_date >= start_date)
```

### Level 3: 資料庫約束
```typescript
- NOT NULL 約束
- Foreign Key 約束
- RLS 政策
- Check 約束 (status enum)
```

### Level 4: 業務邏輯驗證
```typescript
- Free tier 限制 (最多 3 個行程)
- 並發控制 (狀態轉換規則)
- 操作驗證 (索引範圍檢查)
```

---

## 10. 效能最佳化

### 10.1 串流生成
- 使用 SSE 即時傳輸活動
- 前端增量渲染，無需等待完整回應
- 使用者體驗更流暢

### 10.2 JSONB 儲存
- 單一查詢載入完整行程
- 避免多表 JOIN
- 支援 JSON 查詢和索引

### 10.3 LocalStorage 快取
- Chat 歷史本地儲存
- 減少資料庫查詢
- 支援離線瀏覽

### 10.4 地理編碼快取
- 避免重複查詢相同地點
- 減少 API 呼叫成本
- 提升回應速度

---

## 11. 安全性考量

### 11.1 認證與授權
```typescript
- JWT token 驗證 (每個 Edge Function)
- RLS 政策 (資料庫層級)
- user_id 關聯 (確保資料隔離)
```

### 11.2 輸入驗證
```typescript
- Zod schema 驗證所有輸入
- SQL injection 防護 (Supabase 自動處理)
- XSS 防護 (React 自動轉義)
```

### 11.3 Rate Limiting
```typescript
- Free tier 限制 (3 個行程)
- API 呼叫限制 (Supabase 內建)
- 並發控制 (防止重複生成)
```

---

## 12. 未來改進方向

### 12.1 即時協作
- WebSocket 支援
- 多使用者同時編輯
- 衝突解決機制

### 12.2 離線支援
- Service Worker
- IndexedDB 儲存
- 同步佇列

### 12.3 進階 AI 功能
- 圖片識別 (景點照片)
- 語音輸入
- 多語言支援

### 12.4 效能優化
- Virtual scrolling (大量活動)
- 懶載入 (地圖標記)
- CDN 快取 (靜態資源)

---

## 總結

TripAI 的 Activity 資料流設計展現了以下特點：

1. **型別安全**：從前端到後端的完整型別定義
2. **增量更新**：串流生成和細粒度操作
3. **錯誤恢復**：多層次的錯誤處理和 Fallback 機制
4. **使用者體驗**：即時反饋和流暢的互動
5. **可擴展性**：模組化設計和清晰的職責分離

整個系統透過 Zustand 狀態管理、Supabase Edge Functions、和 Gemini AI 的緊密整合，提供了一個強大且靈活的旅遊規劃平台。
