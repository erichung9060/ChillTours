#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
VENV_PATH="$ROOT/python/venv"

echo "============================================"
echo "  ChillTours 開發環境啟動中..."
echo "============================================"
echo

# 檢查虛擬環境是否存在
if [ ! -f "$VENV_PATH/bin/activate" ]; then
    echo "[錯誤] 找不到 Python 虛擬環境"
    echo "       請先執行 setup.sh 完成安裝"
    exit 1
fi

# 依 CPU 核心數自動決定 worker 數 (cpu_count // 2，最少 1，最多 4)
WORKERS=$("$VENV_PATH/bin/python" -c "import os; print(min(max(os.cpu_count()//2,1),4))")

echo "正在啟動 Python API 伺服器（port 8000，$WORKERS workers）..."
cd "$ROOT/python"
source "$VENV_PATH/bin/activate"
uvicorn main:app --workers "$WORKERS" --host 0.0.0.0 --port 8000 &
PYTHON_PID=$!
deactivate 2>/dev/null || true

echo "正在啟動 Next.js 前端（port 3000）..."
cd "$ROOT"
npm run dev &
NEXT_PID=$!

echo
echo "============================================"
echo "  兩個服務已在背景啟動"
echo "  Python API: http://localhost:8000"
echo "  Next.js:    http://localhost:3000"
echo "============================================"
echo
echo "按 Ctrl+C 停止所有服務"

# 等待並在 Ctrl+C 時一起關掉
trap "echo '正在停止服務...'; kill $PYTHON_PID $NEXT_PID 2>/dev/null; exit 0" INT TERM
wait
