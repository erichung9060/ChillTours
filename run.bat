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

:: 依 CPU 核心數自動決定 worker 數 (cpu_count // 2，最少 1，最多 4)
"%VENV_PATH%\Scripts\python.exe" -c "import os; open('_w.tmp','w').write(str(min(max(os.cpu_count()//2,1),4)))"
set WORKERS=1
if exist "_w.tmp" (for /f %%i in (_w.tmp) do set WORKERS=%%i) & del _w.tmp 2>nul

echo 正在啟動 Python API 伺服器（port 8000，%WORKERS% workers / %NUMBER_OF_PROCESSORS% 核）...
start "ChillTours - Python API" cmd /k "cd /d "%ROOT%python" && call "%VENV_PATH%\Scripts\activate.bat" && uvicorn main:app --workers %WORKERS% --host 0.0.0.0 --port 8000"

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
