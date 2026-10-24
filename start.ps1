# GeoSaarthi AI - Windows PowerShell One-Click Launcher
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   GeoSaarthi AI — Windows PowerShell Launcher        " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Node.js is not found in PATH." -ForegroundColor Red
    Write-Host "Please install Node.js (v18+) from https://nodejs.org" -ForegroundColor Yellow
    Pause
    Exit 1
}

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing project dependencies..." -ForegroundColor Yellow
    npm install
}

node "$ScriptDir\scripts\start-all.js"
