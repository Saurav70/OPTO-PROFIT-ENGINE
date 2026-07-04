# ==============================================================================
# OPTO-PROFIT Desktop Build Script
# ==============================================================================
# Run this script once from the desktop\ directory to produce OPTO-PROFIT.exe
#
#   cd S:\OPTO-PROFIT\desktop
#   .\build.ps1
#
# Output: S:\OPTO-PROFIT\desktop\dist\OPTO-PROFIT.exe
# ==============================================================================

param (
    [switch]$Debug
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Desktop = $PSScriptRoot
$Frontend = Join-Path $Root "frontend"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  OPTO-PROFIT Desktop Build Pipeline   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Build React frontend (desktop mode) ───────────────────
Write-Host "[1/5] Building React frontend (desktop mode)..." -ForegroundColor Yellow

Push-Location $Frontend
try {
    & npm.cmd run build -- --mode desktop
    if ($LASTEXITCODE -ne 0) { throw "npm build failed" }
} finally {
    Pop-Location
}
Write-Host "      Frontend build complete." -ForegroundColor Green

# ── Step 2: Copy dist into desktop app folder ─────────────────────
Write-Host "[2/5] Copying frontend dist into desktop/app/dist..." -ForegroundColor Yellow

$SrcDist = Join-Path $Frontend "dist"
$DstDist = Join-Path $Desktop "app\dist"

if (Test-Path $DstDist) { Remove-Item $DstDist -Recurse -Force }
Copy-Item $SrcDist $DstDist -Recurse -Force
Write-Host "      dist/ copied successfully." -ForegroundColor Green

# ── Step 3: Create Python virtual environment ─────────────────────
Write-Host "[3/5] Setting up Python virtual environment..." -ForegroundColor Yellow

$Venv = Join-Path $Desktop "venv"
if (-not (Test-Path $Venv)) {
    & python -m venv $Venv
}
$PythonExe = Join-Path $Venv "Scripts\python.exe"
& $PythonExe -m pip install --quiet --upgrade pip
& $PythonExe -m pip install --quiet -r (Join-Path $Desktop "requirements.txt")

Write-Host "      Generating branded application icon (.ico)..." -ForegroundColor Yellow
$PythonExe = Join-Path $Venv "Scripts\python.exe"
$GenIcoPy  = Join-Path $Desktop "scripts\generate_ico.py"
& $PythonExe $GenIcoPy

Write-Host "      Checking cryptographic license keys..." -ForegroundColor Yellow
$KeyGenPy = Join-Path $Desktop "scripts\keygen.py"
$PublicKey = Join-Path $Desktop "scripts\public_key.hex"
if (-not (Test-Path $PublicKey)) {
    Write-Host "      Public key not found, generating new Ed25519 key pair..." -ForegroundColor Cyan
    & $PythonExe $KeyGenPy --generate-keys
    
    # Auto-patch license.py with the newly generated public key
    $PubHex = Get-Content $PublicKey -Raw
    $LicensePy = Join-Path $Desktop "app\license.py"
    (Get-Content $LicensePy) -replace 'PUBLIC_KEY_HEX = ""', "PUBLIC_KEY_HEX = `"$($PubHex.Trim())`"" | Set-Content $LicensePy
    
    Write-Host "      [!] IMPORTANT: Keep scripts\private_key.pem secure. It is required to issue licenses." -ForegroundColor Red
}

Write-Host "      Python environment ready." -ForegroundColor Green

# ── Step 4: Run PyInstaller ───────────────────────────────────────
Write-Host "[4/5] Running PyInstaller to create OPTO-PROFIT.exe..." -ForegroundColor Yellow

$PyInstaller = Join-Path $Venv "Scripts\pyinstaller.exe"
$PyArmor = Join-Path $Venv "Scripts\pyarmor.exe"

Push-Location $Desktop
try {
    Write-Host "      Copying source code to dist_obf (skipping PyArmor due to AppLocker)..." -ForegroundColor Cyan
    if (Test-Path dist_obf) { Remove-Item -Recurse -Force dist_obf }
    New-Item -ItemType Directory -Path dist_obf | Out-Null
    Copy-Item -Recurse -Force app dist_obf\
    Copy-Item -Force run.py dist_obf\

    $SpecFile = if ($Debug) { "OPTO-PROFIT-DEBUG.spec" } else { "OPTO-PROFIT.spec" }
    Write-Host "      Using spec file: $SpecFile" -ForegroundColor Cyan
    # Run PyInstaller using our customized spec file that filters out system DLLs like COMCTL32.dll
    & $PyInstaller --noconfirm $SpecFile

    if ($LASTEXITCODE -ne 0) { throw "PyInstaller failed" }
} finally {
    Pop-Location
}
Write-Host "      PyInstaller complete." -ForegroundColor Green

# ── Step 5: Done ──────────────────────────────────────────────────
$ExePath = Join-Path $Desktop "dist\OPTO-PROFIT.exe"
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  BUILD SUCCESSFUL!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Executable: $ExePath" -ForegroundColor White
Write-Host "  Size:       $([math]::Round((Get-Item $ExePath).Length / 1MB, 1)) MB"
Write-Host ""
Write-Host "  Share OPTO-PROFIT.exe with anyone." -ForegroundColor Cyan
Write-Host "  Data is stored locally at:" -ForegroundColor Cyan
Write-Host "  %APPDATA%\OPTO-PROFIT\data.db" -ForegroundColor Cyan
Write-Host ""
