@echo off
chcp 65001 >nul
setlocal

set "ROOT=%~dp0"
set "VENV_PATH=%ROOT%python\venv"

echo ============================================
echo   ChillTours 開發環境啟動中...
echo ============================================
echo.

:: 檢查虛擬環境是否存在
if not exist "%VENV_PATH%\Scripts\activate.bat" (
    echo [錯誤] 找不到 Python 虛擬環境
    echo        請先執行 setup.bat 完成安裝
    pause & exit /b 1
)

echo 正在啟動 Python API 伺服器（port 8000）...
start "ChillTours - Python API" cmd /k "cd /d "%ROOT%python" && call "%VENV_PATH%\Scripts\activate.bat" && uvicorn main:app --host 127.0.0.1 --port 8000"

echo 正在啟動 Next.js 前端（port 3000）...
start "ChillTours - Next.js" cmd /k "cd /d "%ROOT%" && npm run dev"

echo.
echo ============================================
echo   兩個服務已在獨立視窗中啟動
echo   Python API: http://localhost:8000
echo   Next.js:    http://localhost:3000
echo ============================================
echo.
echo 關閉此視窗不會停止服務（請關閉各自的視窗停止）
echo.
pause
