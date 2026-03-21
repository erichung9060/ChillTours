# Python 並發模型完整指南

> 本文以 ChillTours OR-Tools 路線優化服務為實驗對象，整理 Python 並發的核心概念、實測結果與工程建議。

---

## 目錄

1. [GIL 是什麼](#1-gil-是什麼)
2. [三種並發模型比較](#2-三種並發模型比較)
3. [多 Worker（Multi-Process）](#3-多-worker-multi-process)
4. [多 Thread（Multi-Thread）](#4-多-thread-multi-thread)
5. [AsyncIO](#5-asyncio)
6. [如何根據核心數自動設定](#6-如何根據核心數自動設定)
7. [OR-Tools 的實際測試結果](#7-or-tools-的實際測試結果)
8. [不同任務類型的選擇建議](#8-不同任務類型的選擇建議)

---

## 1. GIL 是什麼

**GIL（Global Interpreter Lock）** 是 CPython（官方 Python）直譯器的一把全域鎖。

### 為什麼 Python 需要 GIL？

CPython 使用**引用計數**管理記憶體。每個 Python 物件都有一個 `ob_refcnt` 欄位，當兩個 thread 同時對同一個物件增減引用計數時，會發生 race condition，導致物件被提前釋放或記憶體洩漏。

GIL 的規則：**任何時刻只有一個 thread 能執行 Python bytecode**。

```
Thread 1 ──[獲得GIL]──執行──執行──[釋放GIL]──等待──
Thread 2 ──等待──────────────[獲得GIL]──執行──
Thread 3 ──等待──等待────────────────────[獲得GIL]──
```

### GIL 的釋放時機

GIL **不是一直鎖著**，以下情況會釋放：

| 情況 | 說明 |
| ---- | ---- |
| I/O 等待 | 網路請求、檔案讀寫時釋放，其他 thread 可以執行 |
| `time.sleep()` | 明確釋放 GIL |
| C extension | 若 C 程式碼呼叫 `Py_BEGIN_ALLOW_THREADS`，可釋放 GIL |
| 每 5ms | CPython 3.2+ 預設每 5ms 強制切換一次 thread |

### GIL 的影響

```python
# 這段程式碼用 2 個 thread 不會快 2 倍
import threading

def count(n):
    while n > 0:
        n -= 1  # 純 Python 運算，GIL 一直在

t1 = threading.Thread(target=count, args=(10_000_000,))
t2 = threading.Thread(target=count, args=(10_000_000,))
t1.start(); t2.start()
# 實際比單 thread 還慢（因為 GIL 切換開銷）
```

### Python 3.13 Free-Threaded Mode

Python 3.13 引入了實驗性的 **free-threaded build**（`python3.13t`），可以在不使用 GIL 的情況下執行。但：
- 目前仍是實驗性功能（3.14 才更穩定）
- 第三方套件（如 OR-Tools）需要重新編譯才能支援
- NumPy、Pandas 等主流套件已在適配中

---

## 2. 三種並發模型比較

| 模型 | 實作 | GIL 影響 | 適合場景 | 記憶體 |
| ---- | ---- | -------- | -------- | ------ |
| **多 Process** | `ProcessPoolExecutor` / `multiprocessing` | 無（各自有 GIL） | CPU 密集 | 高（各自複製） |
| **多 Thread** | `ThreadPoolExecutor` / `threading` | 有 | I/O 密集 | 低（共享記憶體） |
| **AsyncIO** | `asyncio` / `aiohttp` | 單 thread，協作式 | I/O 密集（大量連線） | 最低 |

### 選擇流程

```
你的任務是什麼？
│
├─ 等待外部資源（API、DB、檔案）
│   ├─ 連線數少（<100）→ ThreadPoolExecutor
│   └─ 連線數多（>100）→ AsyncIO
│
└─ 計算密集（CPU 跑滿）
    ├─ 物件可序列化（pickle）→ ProcessPoolExecutor
    └─ 物件不可序列化 → 重新設計（只傳純資料）
```

---

## 3. 多 Worker（Multi-Process）

### 原理

每個 worker 是獨立的 Python 進程，有自己的記憶體空間和 GIL。

```
主進程
├── Worker 1（PID 1001）── Python + OR-Tools + 獨立 GIL
├── Worker 2（PID 1002）── Python + OR-Tools + 獨立 GIL
├── Worker 3（PID 1003）── Python + OR-Tools + 獨立 GIL
└── Worker 4（PID 1004）── Python + OR-Tools + 獨立 GIL
```

### 用於 Web Server（uvicorn/gunicorn）

```bash
# 固定 worker 數
uvicorn main:app --workers 4

# gunicorn 管理 uvicorn workers（生產環境推薦）
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker

# 根據 CPU 自動計算（gunicorn 慣例）
gunicorn main:app -w $(( $(nproc) * 2 + 1 ))
```

### Worker 數量公式

| 應用類型 | 公式 | 說明 |
| -------- | ---- | ---- |
| I/O 密集 | `cpu_count × 2 + 1` | gunicorn 預設值，大部分時間在等 I/O |
| CPU 密集 | `cpu_count` 或 `cpu_count // 2` | 太多 worker 反而爭搶 CPU |
| 記憶體限制 | `RAM / 每個 worker 記憶體` | 確保不 OOM |

### ChillTours 自動設定（run.bat）

```bat
:: cpu_count // 2，最少 1，最多 4
for /f %%i in ('python -c "import os; print(min(max(os.cpu_count()//2,1),4))"') do set WORKERS=%%i

uvicorn main:app --workers %WORKERS% --host 0.0.0.0 --port 8000
```

| 環境 | CPU 數 | Workers | 說明 |
| ---- | ------ | ------- | ---- |
| 本機開發 | 16 核 | 4 | 上限 4 避免記憶體過高 |
| Railway 免費 | ~1 vCPU | 1 | 自動對應 |
| Railway 付費 | 2-4 vCPU | 1-2 | |
| 一般筆電 | 8 核 | 4 | |

### 限制

```python
# ❌ OR-Tools model 物件無法跨 process 傳送（不可 pickle）
from concurrent.futures import ProcessPoolExecutor

def solve(routing_model):  # routing_model 是 C++ 物件
    return routing_model.Solve()

with ProcessPoolExecutor() as pool:
    pool.submit(solve, routing_model)  # PicklingError!

# ✅ 解法：只傳純資料，在 worker 內重建 model
def solve_from_data(matrix_data, strategy_config):
    # 在 worker 進程內建立 model
    routing = pywrapcp.RoutingModel(...)
    ...
    return result
```

---

## 4. 多 Thread（Multi-Thread）

### I/O 密集：Thread 真的有效

```python
import threading, requests, time

urls = ['https://api1.example.com', 'https://api2.example.com', ...]

# 串行：每個請求等前一個完成
# 時間 = n × 平均延遲

# Thread 並行：同時發出所有請求
# 時間 ≈ max(各請求延遲) ← 因為 I/O 等待時 GIL 釋放
```

**在 ChillTours 完整優化中**，Places API 查詢可以平行化（未來優化方向）：

```python
# 目前：串行查詢每個景點（N × 0.7s）
for activity in activities:
    enriched = enrich_activity(activity)  # 每次 ~0.7s

# 未來：Thread 並行（GIL 在等 HTTP 時釋放）
from concurrent.futures import ThreadPoolExecutor
with ThreadPoolExecutor(max_workers=5) as pool:
    enriched_list = list(pool.map(enrich_activity, activities))
# 時間 ≈ max(各景點查詢延遲) ≈ ~0.7s（不管幾個景點）
```

### CPU 密集：Thread 被 GIL 阻礙

```python
# 測試：OR-Tools 求解是否能平行
# 結論：不行，因為 callback 需要 GIL

def time_cb(fi, ti):          # ← Python 函式
    return matrix[fn][tn]     # ← 每次評估都需要 GIL

# 每次 OR-Tools 計算路徑成本都要回到 Python 取值
# 5 個 thread 同時搶 GIL → 等同串行
```

### RegisterTransitMatrix vs RegisterTransitCallback

```python
# ❌ Python callback：每次查詢都需要 GIL
cb = routing.RegisterTransitCallback(time_cb)

# ✅ 預建矩陣：OR-Tools 把資料複製到 C++ 記憶體
#    查表完全在 C++ 層，理論上不需要 GIL
transit_matrix = [(60, 30, 45), (30, 0, 25), (45, 25, 0)]
cb = routing.RegisterTransitMatrix(transit_matrix)
```

**ChillTours 實測**（RegisterTransitMatrix + ThreadPoolExecutor）：

| n | 策略串行 | 策略平行（Thread） | 改善 |
| - | -------- | ------------------- | ---- |
| 4 | ~1.2s | ~0.76s | 36% ↓ |
| 5 | ~1.4s | ~0.79s | 43% ↓ |
| 6 | ~1.6s | ~0.90s | 44% ↓ |
| 7 | ~0.6s | ~0.49s | 18% ↓ |
| 8 | ~6s | ~1.2s | 80% ↓（主因是移除不必要的 AddDimension） |

---

## 5. AsyncIO

### 協作式並發（不是真正的並行）

```python
import asyncio, aiohttp

async def fetch(session, url):
    async with session.get(url) as resp:
        return await resp.json()   # ← 讓出控制權（等待時不阻塞）

async def main():
    async with aiohttp.ClientSession() as session:
        tasks = [fetch(session, url) for url in urls]
        results = await asyncio.gather(*tasks)  # 同時等待所有
```

### AsyncIO vs Thread

| 項目 | AsyncIO | Thread |
| ---- | ------- | ------ |
| 並發模型 | 協作式（單 thread） | 搶占式（多 thread） |
| 開銷 | 極低（沒有 thread 切換） | 較高（context switch） |
| 適合場景 | 大量短連線（WebSocket、爬蟲） | 少量長請求 |
| 錯誤隔離 | 一個 coroutine 崩潰不影響其他 | thread 崩潰可能互相影響 |
| 現有程式碼相容 | 需要改成 async/await | 包一層即可 |

### FastAPI 的 AsyncIO

```python
# FastAPI 預設支援 async endpoint
@app.post("/optimize")
async def optimize_endpoint(body: OptimizeRequest):
    # ❌ 不能在這裡直接跑 CPU 密集任務
    # result = heavy_computation()  # 會阻塞整個 event loop

    # ✅ 用 run_in_executor 推到 thread pool
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, heavy_computation)
    return result
```

---

## 6. 如何根據核心數自動設定

### 查詢 CPU 資訊

```python
import os, multiprocessing

# 邏輯核心數（包含超執行緒）
logical = os.cpu_count()           # Windows/Linux/Mac 通用
logical = multiprocessing.cpu_count()  # 同上

# 實體核心數（Linux）
import subprocess
physical = int(subprocess.check_output(
    'grep "cpu cores" /proc/cpuinfo | head -1 | awk \'{print $4}\'',
    shell=True
))

# psutil（更可靠，需要安裝）
import psutil
logical = psutil.cpu_count(logical=True)   # 邏輯核心
physical = psutil.cpu_count(logical=False) # 實體核心
```

### 各平台行為差異

| 平台 | `os.cpu_count()` | 注意事項 |
| ---- | ---------------- | -------- |
| Windows 16核（超執行緒） | 16 | 回傳邏輯核心（包含 HT） |
| Linux 8核 | 8 | |
| macOS M2 Pro | 12 | |
| Docker 容器（限制 CPU） | 可能回傳宿主機核心數 | 需要讀 `/sys/fs/cgroup` |
| Railway 免費方案 | 可能回傳 1 或宿主機數 | 需要實際測試 |

### 容器環境的正確做法

```python
import os

def get_effective_cpu_count() -> int:
    """
    在容器環境中，os.cpu_count() 可能回傳宿主機的核心數
    而不是容器被分配的 CPU 數。
    嘗試從 cgroup 讀取實際限制。
    """
    try:
        # Linux cgroup v1
        with open('/sys/fs/cgroup/cpu/cpu.cfs_quota_us') as f:
            quota = int(f.read())
        with open('/sys/fs/cgroup/cpu/cpu.cfs_period_us') as f:
            period = int(f.read())
        if quota > 0:
            return max(1, int(quota / period))
    except (FileNotFoundError, ValueError):
        pass

    try:
        # Linux cgroup v2
        with open('/sys/fs/cgroup/cpu.max') as f:
            quota_str, period_str = f.read().split()
            if quota_str != 'max':
                return max(1, int(int(quota_str) / int(period_str)))
    except (FileNotFoundError, ValueError):
        pass

    return os.cpu_count() or 1


def recommend_workers(task_type: str = 'cpu') -> int:
    """
    根據任務類型推薦 worker 數。
    task_type: 'cpu'（計算密集）或 'io'（I/O 密集）
    """
    cpus = get_effective_cpu_count()
    if task_type == 'io':
        return min(cpus * 2 + 1, 32)  # gunicorn 慣例
    else:  # cpu
        return min(max(cpus // 2, 1), 4)  # ChillTours 做法
```

### ChillTours 在各環境的 Worker 數

```python
# python/main.py
SOLVER_TIME_LIMIT_SMALL = int(os.getenv("SOLVER_TIME_LIMIT_SMALL", "1"))
SOLVER_TIME_LIMIT_LARGE = int(os.getenv("SOLVER_TIME_LIMIT_LARGE", "3"))

# run.bat（Windows 本機）
# min(max(cpu_count // 2, 1), 4)
```

### 環境變數覆蓋（.env.local）

```bash
# 本機開發：16 核，用 4 workers
# （由 run.bat 自動計算，不需要設定）

# Railway 生產：CPU 較弱，降低時限
SOLVER_TIME_LIMIT_SMALL=1
SOLVER_TIME_LIMIT_LARGE=2

# 高效能伺服器：可以拉高
SOLVER_TIME_LIMIT_SMALL=2
SOLVER_TIME_LIMIT_LARGE=5
```

---

## 7. OR-Tools 的實際測試結果

### 測試結論

| 問題 | 預期 | 實際 | 原因 |
| ---- | ---- | ---- | ---- |
| Thread 平行求解應該加速 | 5 策略 → 時間 / 5 | n=4~7 有改善，n=8 無改善 | GIL + OR-Tools 內部 mutex |
| 增加時限應該提升品質 | 更長搜尋 → 更好解 | 1s = 5s = 10s，品質完全一樣 | `solution_limit=100` 提早收斂 |
| `RegisterTransitMatrix` 應比 callback 快 | 無 GIL 查表 | n=4~7 確實更快 | 初始化時複製到 C++ |

### 為什麼 solution_limit=100 就夠了？

台灣旅遊路線問題屬於**小規模 TSP**，有幾個特性讓 OR-Tools 很容易找到最優解：

1. **景點少（n ≤ 12）** — 解空間小，前幾個解就接近最優
2. **地理結構規律** — 台灣細長，最短路線幾乎是「直走型」
3. **距離矩陣簡單** — Google Maps 公路距離和直線距離高度相關

```
實驗：n=10，全台分散景點
solution_limit=10  → cost=530min（0.00s）
solution_limit=100 → cost=530min（0.01s）
solution_limit=無限 → cost=530min（跑滿時限）

→ 前 10 個解就已是最優解
```

### RegisterTransitCallback vs RegisterTransitMatrix 關鍵差異

```python
# RegisterTransitCallback（舊做法）
def time_cb(fi, ti):
    fn = manager.IndexToNode(fi)
    tn = manager.IndexToNode(ti)
    return matrix[fn][tn]      # ← 每次訪問 Python list 需要 GIL

cb = routing.RegisterTransitCallback(time_cb)
# OR-Tools 求解時每條邊都呼叫 time_cb → 頻繁搶 GIL

# RegisterTransitMatrix（新做法）
transit = [(60, 30), (30, 60)]  # 預建矩陣
cb = routing.RegisterTransitMatrix(transit)
# 初始化時一次性複製到 C++ → 求解時查表在 C++ 內完成
```

---

## 8. 不同任務類型的選擇建議

### 常見場景速查表

| 場景 | 推薦方案 | 理由 |
| ---- | -------- | ---- |
| 同時呼叫多個外部 API | `ThreadPoolExecutor` | I/O 等待時 GIL 釋放 |
| Web server 處理並發請求 | `uvicorn --workers N` | 多進程，完全無 GIL |
| 影像/影片處理 | `ProcessPoolExecutor` | CPU 密集，需要真平行 |
| 大量 WebSocket 連線 | `asyncio` | 協作式，低開銷 |
| 資料庫查詢（async） | `asyncio + asyncpg` | async 驅動 |
| OR-Tools / 數值計算 | `ProcessPoolExecutor`（傳資料非物件） | C++ 內部 mutex 阻礙 Thread |
| NumPy 向量運算 | `ThreadPoolExecutor`（NumPy 釋放 GIL） | NumPy C extension 釋放 GIL |
| Pandas 資料處理 | `ProcessPoolExecutor` | Pandas 不釋放 GIL |

### 完整優化 Places API 並行化（建議實作）

```python
# 目前：串行，N × 0.7s
for activity in activities:
    enriched = enrich_activity(activity)

# 建議：Thread 並行（HTTP I/O，GIL 會釋放）
from concurrent.futures import ThreadPoolExecutor

with ThreadPoolExecutor(max_workers=min(len(activities), 5)) as pool:
    enriched_list = list(pool.map(enrich_activity, activities))
# 時間從 N × 0.7s → max(各請求) ≈ 0.7s
```

### 判斷任務是否適合 Thread 的實驗方法

```python
import time, threading

def task():
    # 你的實際任務
    ...

# 測試：2 個 thread 是否比 1 個快？
t0 = time.perf_counter()
t1 = threading.Thread(target=task)
t2 = threading.Thread(target=task)
t1.start(); t2.start()
t1.join(); t2.join()
parallel_time = time.perf_counter() - t0

t0 = time.perf_counter()
task(); task()
serial_time = time.perf_counter() - t0

speedup = serial_time / parallel_time
print(f"加速比: {speedup:.2f}x")
# > 1.5x → 任務適合 Thread（I/O 密集）
# ≈ 1.0x → 任務被 GIL 限制（CPU 密集）
# < 1.0x → Thread 開銷大於收益
```

### 總結

```
任務類型          GIL 影響    推薦方案
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HTTP API 呼叫     無（I/O）   Thread / AsyncIO
資料庫查詢        無（I/O）   Thread / AsyncIO
OR-Tools 求解     有          多 Worker（Process）
NumPy 運算        無          Thread
純 Python 計算    有          Process
```
