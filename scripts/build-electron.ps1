# ==============================================================================
# OPTO-PROFIT - Electron Desktop Build Script
# ==============================================================================
# Builds the complete Electron desktop application:
#   1. Build the React frontend (desktop mode)
#   2. Build the Python backend via PyInstaller
#   3. Package everything with electron-builder
#
# Usage:
#   cd k:\OPTO-PROFIT
#   .\scripts\build-electron.ps1
#
# Output: k:\OPTO-PROFIT\release\
# ==============================================================================

param (
    [switch]$SkipFrontend,
    [switch]$SkipBackend,
    [switch]$Portable
)

$ErrorActionPreference = "Stop"
$Root     = Split-Path -Parent $PSScriptRoot
$Frontend = Join-Path $Root "frontend"
$Backend  = Join-Path $Root "backend"

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  OPTO-PROFIT Electron Build Pipeline              " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# --- Step 1: Build React frontend ---------------------------------
if (-not $SkipFrontend) {
    Write-Host "[1/4] Building React frontend (desktop mode)..." -ForegroundColor Yellow

    Push-Location $Frontend
    try {
        & npm.cmd run build -- --mode desktop
        if ($LASTEXITCODE -ne 0) { throw "Frontend build failed with exit code $LASTEXITCODE" }
    } finally {
        Pop-Location
    }
    Write-Host "      > Frontend build complete." -ForegroundColor Green
} else {
    Write-Host "[1/4] Skipping frontend build." -ForegroundColor DarkGray
}

# --- Step 2: Build Python backend via PyInstaller ------------------
if (-not $SkipBackend) {
    Write-Host "[2/4] Building Python backend (PyInstaller)..." -ForegroundColor Yellow

    # Copy frontend dist into backend for the SPA serving route
    $FrontendDist = Join-Path $Frontend "dist"
    $BackendDist  = Join-Path $Backend "dist"
    if (Test-Path $BackendDist) { Remove-Item $BackendDist -Recurse -Force }
    Copy-Item $FrontendDist $BackendDist -Recurse -Force
    Write-Host "      Copied frontend dist -> backend/dist" -ForegroundColor DarkCyan

    # Ensure Python venv exists and has dependencies
    $Venv = Join-Path $Backend "venv"
    if (-not (Test-Path $Venv)) {
        Write-Host "      Creating Python virtual environment..." -ForegroundColor DarkCyan
        & python -m venv $Venv
        if ($LASTEXITCODE -ne 0) { throw "Failed to create Python venv" }
    }

    $Pip       = Join-Path $Venv "Scripts\pip.exe"
    $PythonExe = Join-Path $Venv "Scripts\python.exe"

    & $Pip install --quiet --upgrade pip
    & $Pip install --quiet -r (Join-Path $Backend "requirements.txt")

    # Run PyInstaller
    $PyInstaller = Join-Path $Venv "Scripts\pyinstaller.exe"
    $DesktopDir  = Join-Path $Root "desktop"
    $IconPath    = Join-Path $DesktopDir "optoprofit_icon.ico"
    $IconArg     = @()
    if (Test-Path $IconPath) { $IconArg = @("--icon", $IconPath) }

    Push-Location $Backend
    try {
        & $PyInstaller `
            --noconfirm `
            --onefile `
            --console `
            --name "OPTO-PROFIT" `
            --add-data "dist;dist" `
            --add-data "app;app" `
            --hidden-import "uvicorn.logging" `
            --hidden-import "uvicorn.loops" `
            --hidden-import "uvicorn.loops.auto" `
            --hidden-import "uvicorn.protocols" `
            --hidden-import "uvicorn.protocols.http" `
            --hidden-import "uvicorn.protocols.http.auto" `
            --hidden-import "uvicorn.protocols.websockets" `
            --hidden-import "uvicorn.protocols.websockets.auto" `
            --hidden-import "uvicorn.lifespan" `
            --hidden-import "uvicorn.lifespan.on" `
            --hidden-import "email_validator" `
            --hidden-import "slowapi" `
            --hidden-import "slowapi.util" `
            --hidden-import "slowapi.errors" `
            --hidden-import "pyotp" `
            --hidden-import "multipart" `
            --hidden-import "fastapi.staticfiles" `
            --hidden-import "fastapi.responses" `
            --hidden-import "fastapi.middleware" `
            --hidden-import "fastapi.middleware.cors" `
            --hidden-import "starlette.middleware" `
            --hidden-import "starlette.middleware.cors" `
            --hidden-import "starlette.middleware.base" `
            --hidden-import "starlette.routing" `
            --hidden-import "starlette.staticfiles" `
            --hidden-import "starlette.responses" `
            --hidden-import "starlette.requests" `
            --hidden-import "sqlalchemy.dialects.sqlite" `
            --hidden-import "passlib.handlers.bcrypt" `
            --hidden-import "jose" `
            --hidden-import "jose.jwt" `
            --hidden-import "dotenv" `
            @IconArg `
            "run_desktop.py"

        if ($LASTEXITCODE -ne 0) { throw "PyInstaller failed with exit code $LASTEXITCODE" }
    } finally {
        Pop-Location
    }

    $BackendExe = Join-Path $Backend "dist\OPTO-PROFIT.exe"
    if (Test-Path $BackendExe) {
        $SizeMB = [math]::Round((Get-Item $BackendExe).Length / 1MB, 1)
        Write-Host "      > Backend built: $SizeMB MB" -ForegroundColor Green
    } else {
        throw "Backend exe not found at $BackendExe"
    }
} else {
    Write-Host "[2/4] Skipping backend build." -ForegroundColor DarkGray
}

# --- Step 3: Install Electron dependencies -------------------------
Write-Host "[3/4] Installing Electron dependencies..." -ForegroundColor Yellow

Push-Location $Root
try {
    & npm.cmd install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
} finally {
    Pop-Location
}
Write-Host "      > Dependencies installed." -ForegroundColor Green

# --- Step 4: Run electron-builder ----------------------------------
Write-Host "[4/4] Packaging with electron-builder..." -ForegroundColor Yellow

Push-Location $Root
try {
    if ($Portable) {
        & npx.cmd electron-builder --config electron-builder.config.js --win portable
    } else {
        & npx.cmd electron-builder --config electron-builder.config.js
    }
    if ($LASTEXITCODE -ne 0) { throw "electron-builder failed with exit code $LASTEXITCODE" }
} finally {
    Pop-Location
}

# --- Done ----------------------------------------------------------
Write-Host ""
Write-Host "===================================================" -ForegroundColor Green
Write-Host "  BUILD SUCCESSFUL!                                " -ForegroundColor Green
Write-Host "===================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Output directory: $Root\release\" -ForegroundColor White
Write-Host ""
Write-Host "  The installer and/or portable exe are ready." -ForegroundColor Cyan
Write-Host "  Share them with anyone - no Python or Node.js needed!" -ForegroundColor Cyan
Write-Host ""
