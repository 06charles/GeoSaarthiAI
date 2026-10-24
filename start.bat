@echo off
REM GeoSaarthi AI - Windows One-Click Launcher
setlocal

cd /d "%~dp0"

echo =======================================================
echo    GeoSaarthi AI — Windows One-Click Launcher
echo =======================================================

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not found in PATH.
    echo Please install Node.js (v18+) from https://nodejs.org
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Installing project dependencies...
    call npm install
)

node "%~dp0scripts\start-all.js"

endlocal
