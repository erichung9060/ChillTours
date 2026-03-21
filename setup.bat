@echo off
chcp 65001 >nul
setlocal

echo ============================================
echo   ChillTours 開發環境安裝腳本
echo ============================================
echo.

set "ROOT=%~dp0"
set "PYTHON_DIR=%ROOT%python"
set "VENV_PATH=%ROOT%python\venv"

:: 檢查 Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [錯誤] 找不到 Python，請先安裝 Python 3.9 以上版本
    echo        下載網址: https://www.python.org/downloads/
    pause & exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do echo [OK] %%i

:: 檢查 Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [錯誤] 找不到 Node.js，請先安裝 Node.js 18 以上版本
    echo        下載網址: https://nodejs.org/
    pause & exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo [OK] Node.js %%i

echo.
echo [1/3] 建立 Python 虛擬環境（python\venv）...
if exist "%VENV_PATH%\Scripts\activate.bat" (
    echo [跳過] 虛擬環境已存在
) else (
    python -m venv "%VENV_PATH%"
    if errorlevel 1 ( echo [錯誤] 建立虛擬環境失敗 & pause & exit /b 1 )
    echo [OK] 虛擬環境建立完成
)

echo.
echo [2/3] 安裝 Python 依賴（OR-Tools、FastAPI 等）...
echo       注意：OR-Tools 首次下載可能需要幾分鐘，請耐心等候...
"%VENV_PATH%\Scripts\pip" install -r "%PYTHON_DIR%\requirements.txt"
if errorlevel 1 ( echo [錯誤] 安裝 Python 依賴失敗 & pause & exit /b 1 )
echo [OK] Python 依賴安裝完成

echo.
echo [3/3] 安裝 Node.js 依賴（npm install）...
cd /d "%ROOT%"
npm install
if errorlevel 1 ( echo [錯誤] npm install 失敗 & pause & exit /b 1 )
echo [OK] Node.js 依賴安裝完成

echo.
echo ============================================
echo   安裝完成！
echo ============================================
echo.
echo 日後啟動：雙擊 run.bat 即可
echo.
pause
