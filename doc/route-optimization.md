# 路線優化系統說明

> 對應程式：`python/main.py`
> 測試環境：Intel Core i 系列、Windows 11、Python 3.12 venv

---

## 整體架構

```
前端按鈕
  ├─ 快速優化 → POST /api/optimize-route      → lib/route-optimization/orchestrator.ts
  │                                               ├─ Google Distance Matrix（距離矩陣）
  │                                               └─ ORS Vroom / Greedy fallback
  └─ 完整優化 → POST /api/optimize-route-full → lib/route-optimization/orchestrator.ts
                                                  ├─ resolve-places Edge Function
                                                  │    ├─ Google Places 查詢精確座標
                                                  │    ├─ 取得當天營業時間
                                                  │    └─ 快取至 google_places 表
                                                  └─ ORS Vroom（含時間窗）/ Greedy fallback
```

---

## 距離矩陣

### 主要：Google Maps Distance Matrix API

- 單次 N×N API call（N 個景點 = 1 次請求，非 N² 次）
- 回傳真實路況時間（分鐘）

### 備用（API 失敗時）：Haversine 公式

- 直線距離 ÷ 預設速度，不考慮路況，精度較低

### 交通方式（`mode` 參數）

| mode | 說明 | Haversine 備用速度 |
|------|------|--------------------|
| `driving` | 開車（預設，快速 + 完整均使用） | 40 km/h |
| `walking` | 步行 | 4 km/h |
| `transit` | 大眾運輸（含等車/轉乘） | 20 km/h |
| `bicycling` | 自行車 | 15 km/h |

---

## 可行性預檢

進入 OR-Tools 前先計算：

```
總停留時間 + 最短旅行下界 > 可用時間(+60min 緩衝)
→ 直接跳 Layer 3，省去等待
```

適用於：景點多、每個景點停留時間長、或時間窗限制嚴格的情況。
僅在有時間窗（完整優化）時觸發，快速優化不做此檢查。

---

## 三層降級策略

### Layer 1：虛擬 depot（自由起點）

```
節點 0  = 虛擬起點（成本全 0）
節點 1~n = 實際景點
→ OR-Tools 自由選擇從哪個景點出發
```

### Layer 2：智能固定起點（Layer 1 全部策略失敗後啟動）

```
smart_start = 有時間窗的景點中，開門最早的那個
→ 固定從該景點出發，減少時間窗衝突
```

### Layer 3：時間窗感知 Greedy（保底，一定有解）

```
有時間窗：從最早開門的景點出發
          每步優先選「能在關門前抵達、等待+移動最少」的景點
          開門很晚的景點（夜市等）自動排後面
無時間窗：從 index 0 出發，選最近鄰居
```

---

## 時間窗約束（僅完整優化）

由 Google Places API `opening_hours.periods` 提供，轉換為：

```python
lo = max(0, 開門時間 - 出發時間 - 30min)  # 允許提早 30 分鐘到達等待
hi = 關門時間 - 出發時間
CumulVar(node).SetRange(lo, hi)
```

**重要**：`AddDimension` 只在有時間窗時才加入，無時間窗不加（加了會讓問題難度提升 70 倍）。

---

## 多策略平行輪試

Layer 1 / Layer 2 都使用 `ThreadPoolExecutor` 同時跑所有策略，取 `ObjectiveValue()` 最小者。
使用 `RegisterTransitMatrix`（預先算好矩陣傳給 OR-Tools），無需 Python callback。

### n ≤ 8（每策略時限 1 秒，5 策略平行）

| # | 初始解策略 | 局部搜尋 | 時限 |
|---|-----------|---------|------|
| 1 | PATH_CHEAPEST_ARC | GUIDED_LOCAL_SEARCH | 1s |
| 2 | SAVINGS | TABU_SEARCH | 1s |
| 3 | CHRISTOFIDES | GUIDED_LOCAL_SEARCH | 1s |
| 4 | PARALLEL_CHEAPEST_INSERTION | SIMULATED_ANNEALING | 1s |
| 5 | LOCAL_CHEAPEST_INSERTION | GENERIC_TABU_SEARCH | 1s |

最壞情況：**~1s**（5 策略平行，取最佳）

### n > 8（每策略時限 3 秒，4 策略平行）

| # | 初始解策略 | 局部搜尋 | 時限 |
|---|-----------|---------|------|
| 1 | PARALLEL_CHEAPEST_INSERTION | GUIDED_LOCAL_SEARCH | 3s |
| 2 | SAVINGS | GUIDED_LOCAL_SEARCH | 3s |
| 3 | LOCAL_CHEAPEST_INSERTION | TABU_SEARCH | 3s |
| 4 | CHRISTOFIDES | SIMULATED_ANNEALING | 3s |

最壞情況：**~3s**（4 策略平行）

---

## 初始解策略說明

| 策略 | 原理 |
|------|------|
| **PATH_CHEAPEST_ARC** | 貪心：每次選最短的下一個點，最快建出初始解 |
| **SAVINGS** | Clarke-Wright 節省法：合併路段，從省最多的開始 |
| **CHRISTOFIDES** | 理論保證不超過最優解 1.5 倍，初始解品質最好 |
| **PARALLEL_CHEAPEST_INSERTION** | 插入「增加成本最少」的點（並行版） |
| **LOCAL_CHEAPEST_INSERTION** | 同上，序列版 |

## 局部搜尋策略說明

| 策略 | 原理 |
|------|------|
| **GUIDED_LOCAL_SEARCH** | 對走過的弧加懲罰，逼它探索新路徑，最強 |
| **TABU_SEARCH** | 禁忌清單記錄最近移動，禁止回頭，強迫探索 |
| **SIMULATED_ANNEALING** | 模擬退火：初期允許接受較差解，逐漸收斂 |
| **GENERIC_TABU_SEARCH** | Tabu 泛化版，複雜約束場景效果較好 |

---

## 實際執行時間（含 Google API）

> 測試硬體：本機 Windows 11 16 核，每組跑 2 次平均

### 快速優化（無時間窗）

| 景點數 | 時間 | 備註 |
| ------ | ---- | ---- |
| n=3 | ~0.6s | 幾乎都是 Google API 延遲 |
| n=4 | ~0.7s | |
| n=5 | ~0.8s | |
| n=6 | ~1.0s | |
| n=7 | ~0.5s | solution_limit=100 提早收斂 |
| n=8 | ~1.2s | |
| n=10 | ~0.5s | |

### 完整優化（有時間窗）

| 景點數 | 時間 | 說明 |
| ------ | ---- | ---- |
| n=4~7 | ~0.8~1.3s | Layer 1 找到解 ✓ |
| n=8 + 時間窗 | ~0.8s | 預檢判定不可行→直接 Layer 3 |
| n=5 + 停留 120min | ~0.4s | 預檢立即跳過 |

### 完整優化額外步驟

1. **resolve-places Edge Function**（批次最多 5 個，呼叫 Google Places New API）
   - Find Place Text Search（每景點 ~0.3s）
   - Place Details（每景點 ~0.4s，$0.05/call）
   - 快取至 `google_places` 表（Supabase）— 查詢過的景點不重複付費
2. **回傳精確座標 + 當天營業時間** → 重建距離矩陣（若座標偏移 >0.001°）

```
總時間（無快取）≈ N × 0.7s + 0.5s + Vroom
N=5：5 × 0.7 + 0.5 + 0.8 ≈ 4.8s
```

有快取後 Places API 跳過，接近快速優化時間。

---

## 時間構成

```
總時間 ≈ Google Distance Matrix API（~0.5s，與 n 無關）
       + OR-Tools 運算（CPU bound，平行後約 0.5~1s）
       + OR-Tools 模型建立（~50ms）
```

**Google API 延遲** → 與硬體無關，取決於網路。

**OR-Tools 運算** → CPU bound，CPU 越強在相同時限內能搜更大空間（解品質更好），但時間上限不超過設定值。Railway 免費方案 CPU 較弱，解品質略差但不超時。

---

## 關鍵優化歷程

| 問題 | 根本原因 | 解法 |
| ---- | -------- | ---- |
| n=8 無時間窗 9s | 不必要的 `AddDimension` 讓問題難 70 倍 | 只在有 `opening_hours` 時才加 |
| 策略串行慢 | 5 策略依序執行 | `ThreadPoolExecutor` 平行 |
| Layer 3 忽略時間窗 | 純最近鄰居 | 時間窗感知 Greedy |
| 時間不夠仍嘗試 OR-Tools | 無預檢 | 可行性預檢，直接跳 Layer 3 |
| GIL 阻礙平行 | Python callback | `RegisterTransitMatrix` |
