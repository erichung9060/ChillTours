@echo off
chcp 65001 >nul
setlocal

set "ROOT=%~dp0"
set "VENV_PATH=%ROOT%python\venv"

echo ============================================
echo   ChillTours 開發環境啟動中（含本地 Supabase）
echo ============================================
echo.

:: 檢查虛擬環境是否存在
if not exist "%VENV_PATH%\Scripts\activate.bat" (
    echo [錯誤] 找不到 Python 虛擬環境
    echo        請先執行 setup.bat 完成安裝
    pause & exit /b 1
)

:: 檢查 supabase CLI 是否存在（支援 npx 方式）
where supabase >nul 2>&1
if errorlevel 1 (
    call npx supabase --version >nul 2>&1
    if errorlevel 1 (
        echo [錯誤] 找不到 supabase CLI
        pause & exit /b 1
    )
    set "SUPA_CMD=npx supabase"
) else (
    set "SUPA_CMD=supabase"
)

:: 檢查 Docker 是否運行
docker info >nul 2>&1
if errorlevel 1 (
    echo [錯誤] Docker 未啟動，本地 Supabase 需要 Docker
    echo        請先開啟 Docker Desktop 後再執行此腳本
    pause & exit /b 1
)

echo 正在啟動本地 Supabase（首次啟動需要幾分鐘下載 Docker image）...
start "ChillTours - Supabase" cmd /k "cd /d "%ROOT%" && %SUPA_CMD% start"

echo.
echo [等待] 請等待 Supabase 啟動完成後，複製輸出的環境變數到 .env.local
echo        API URL:  http://localhost:54321
echo        anon key: 見 Supabase 啟動輸出
echo.
echo 按任意鍵繼續啟動其他服務...
pause >nul

:: 依 CPU 核心數自動決定 worker 數
"%VENV_PATH%\Scripts\python.exe" -c "import os; open('_w.tmp','w').write(str(min(max(os.cpu_count()//2,1),4)))"
set WORKERS=1
if exist "_w.tmp" (for /f %%i in (_w.tmp) do set WORKERS=%%i) & del _w.tmp 2>nul

echo 正在啟動 Python API 伺服器（port 8000，%WORKERS% workers / %NUMBER_OF_PROCESSORS% 核）...
start "ChillTours - Python API" cmd /k "cd /d "%ROOT%python" && call "%VENV_PATH%\Scripts\activate.bat" && uvicorn main:app --workers %WORKERS% --host 0.0.0.0 --port 8000"

echo 正在啟動 Next.js 前端（port 3000）...
start "ChillTours - Next.js" cmd /k "cd /d "%ROOT%" && npm run dev"

echo.
echo ============================================
echo   所有服務已在獨立視窗中啟動
echo   Supabase:   http://localhost:54323 (Studio)
echo   Supabase:   http://localhost:54321 (API)
echo   Python API: http://localhost:8000
echo   Next.js:    http://localhost:3000
echo ============================================
echo.
echo 提示：Edge Function 本地測試請在 Supabase 視窗執行：
echo   npx supabase functions serve generate-itinerary
echo.
echo 關閉此視窗不會停止服務（請關閉各自的視窗停止）
echo.
pause
