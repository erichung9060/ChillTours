#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
PYTHON_DIR="$ROOT/python"
VENV_PATH="$ROOT/python/venv"

echo "============================================"
echo "  ChillTours 開發環境安裝腳本"
echo "============================================"
echo

# 檢查 Python
if ! command -v python3 &>/dev/null; then
    echo "[錯誤] 找不到 Python，請先安裝 Python 3.9 以上版本"
    echo "       macOS: brew install python"
    exit 1
fi
echo "[OK] $(python3 --version)"

# 檢查 Node.js
if ! command -v node &>/dev/null; then
    echo "[錯誤] 找不到 Node.js，請先安裝 Node.js 18 以上版本"
    echo "       macOS: brew install node"
    exit 1
fi
echo "[OK] Node.js $(node --version)"

echo
echo "[1/3] 建立 Python 虛擬環境（python/venv）..."
if [ -f "$VENV_PATH/bin/activate" ]; then
    echo "[跳過] 虛擬環境已存在"
else
    python3 -m venv "$VENV_PATH"
    echo "[OK] 虛擬環境建立完成"
fi

echo
echo "[2/3] 安裝 Python 依賴（OR-Tools、FastAPI 等）..."
echo "      注意：OR-Tools 首次下載可能需要幾分鐘，請耐心等候..."
"$VENV_PATH/bin/pip" install -r "$PYTHON_DIR/requirements.txt"
echo "[OK] Python 依賴安裝完成"

echo
echo "[3/3] 安裝 Node.js 依賴（npm install）..."
cd "$ROOT"
npm install
echo "[OK] Node.js 依賴安裝完成"

echo
echo "============================================"
echo "  安裝完成！"
echo "============================================"
echo
echo "日後啟動：./run.sh"
echo
