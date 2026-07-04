# ==============================================================================
# OPTO-PROFIT Desktop Build Script
# ==============================================================================
# Run this script from the backend\ directory to produce OPTO-PROFIT.exe
#
#   cd k:\OPTO-PROFIT\backend
#   .\build.ps1
#
# Output: k:\OPTO-PROFIT\backend\dist\OPTO-PROFIT.exe
# ==============================================================================

$ErrorActionPreference = "Stop"
$Backend  = $PSScriptRoot
$Root     = Split-Path -Parent $Backend
$Frontend = Join-Path $Root "frontend"
$Desktop  = Join-Path $Root "desktop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  OPTO-PROFIT Desktop Build Pipeline   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Build React frontend (desktop mode) ───────────────────
Write-Host "[1/4] Building React frontend (desktop mode)..." -ForegroundColor Yellow

Push-Location $Frontend
try {
    & npm.cmd run build -- --mode desktop
    if ($LASTEXITCODE -ne 0) { throw "npm build failed with exit code $LASTEXITCODE" }
} finally {
    Pop-Location
}
Write-Host "      Frontend build complete." -ForegroundColor Green

# ── Step 2: Copy dist into backend directory ──────────────────────
Write-Host "[2/4] Copying frontend dist into backend/dist..." -ForegroundColor Yellow

$SrcDist = Join-Path $Frontend "dist"
$DstDist = Join-Path $Backend "dist"

if (Test-Path $DstDist) { Remove-Item $DstDist -Recurse -Force }
Copy-Item $SrcDist $DstDist -Recurse -Force
Write-Host "      dist/ copied successfully." -ForegroundColor Green

# ── Step 3: Ensure Python environment is ready ────────────────────
Write-Host "[3/4] Setting up Python virtual environment..." -ForegroundColor Yellow

$Venv = Join-Path $Backend "venv"
if (-not (Test-Path $Venv)) {
    & python -m venv $Venv
    if ($LASTEXITCODE -ne 0) { throw "Failed to create Python venv" }
}

$Pip       = Join-Path $Venv "Scripts\pip.exe"

& $Pip install --quiet --upgrade pip
& $Pip install --quiet -r (Join-Path $Backend "requirements.txt")

Write-Host "      Python environment ready." -ForegroundColor Green

# ── Step 4: Run PyInstaller ───────────────────────────────────────
Write-Host "[4/4] Running PyInstaller to create OPTO-PROFIT.exe..." -ForegroundColor Yellow

$PyInstaller = Join-Path $Venv "Scripts\pyinstaller.exe"
$PyArmor = Join-Path $Venv "Scripts\pyarmor.exe"

# Resolve icon path (use existing desktop icon if available)
$IconArg = @()
$IconPath = Join-Path $Desktop "optoprofit_icon.ico"
if (Test-Path $IconPath) {
    $IconArg = @("--icon", $IconPath)
    Write-Host "      Using icon: $IconPath" -ForegroundColor Cyan
}

Push-Location $Backend
try {
    Write-Host "      Obfuscating sensitive source code with PyArmor..." -ForegroundColor Cyan
    if (Test-Path dist_obf) { Remove-Item -Recurse -Force dist_obf }
    New-Item -ItemType Directory -Path dist_obf | Out-Null
    Copy-Item -Recurse -Force app dist_obf\
    Copy-Item -Force run_desktop.py dist_obf\

    & $PyArmor gen -O dist_obf app\auth.py app\database.py app\license.py app\sql_models.py
    if ($LASTEXITCODE -ne 0) { throw "PyArmor obfuscation failed with exit code $LASTEXITCODE" }

    & $PyInstaller `
        --noconfirm `
        --onefile `
        --windowed `
        --name "OPTO-PROFIT" `
        --add-data "dist;dist" `
        --paths "dist_obf" `
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
        --hidden-import "webview" `
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
        "dist_obf\run_desktop.py"

    if ($LASTEXITCODE -ne 0) { throw "PyInstaller failed with exit code $LASTEXITCODE" }
} finally {
    Pop-Location
}
Write-Host "      PyInstaller complete." -ForegroundColor Green

# ── Done ──────────────────────────────────────────────────────────
$ExePath = Join-Path $Backend "dist\OPTO-PROFIT.exe"
if (Test-Path $ExePath) {
    $SizeMB = [math]::Round((Get-Item $ExePath).Length / 1MB, 1)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Executable: $ExePath" -ForegroundColor White
    Write-Host "  Size:       $SizeMB MB"
    Write-Host ""
    Write-Host "  Share OPTO-PROFIT.exe with anyone." -ForegroundColor Cyan
    Write-Host "  Data is stored locally at:" -ForegroundColor Cyan
    Write-Host "  %LOCALAPPDATA%\OPTO-PROFIT\optoprofit.db" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  BUILD FAILED!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  Expected output not found: $ExePath" -ForegroundColor Red
    Write-Host ""
    exit 1
}
