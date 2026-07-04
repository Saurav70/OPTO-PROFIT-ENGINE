Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$DocRoot = "$PSScriptRoot\..\docs\source_code"
$BackendDocDir = "$DocRoot\backend"
$FrontendDocDir = "$DocRoot\frontend"

Write-Host "== Cleaning previous documentation =="
if (Test-Path $BackendDocDir) { Remove-Item -Recurse -Force $BackendDocDir\* } else { New-Item -ItemType Directory -Force -Path $BackendDocDir | Out-Null }
if (Test-Path $FrontendDocDir) { Remove-Item -Recurse -Force $FrontendDocDir\* } else { New-Item -ItemType Directory -Force -Path $FrontendDocDir | Out-Null }

Write-Host "== Generating Backend Docs (pdoc) =="
Push-Location "$PSScriptRoot\..\backend"
try {
  # pdoc 16.0.0 uses pdoc ./app -o <dir>
  .\venv\Scripts\python.exe -m pdoc ./app -o $BackendDocDir
  if ($LASTEXITCODE -ne 0) { throw "Backend docs generation failed with exit code $LASTEXITCODE" }
}
finally {
  Pop-Location
}

Write-Host "== Generating Frontend Docs (jsdoc) =="
Push-Location "$PSScriptRoot\..\frontend"
try {
  npm run docs
  if ($LASTEXITCODE -ne 0) { throw "Frontend docs generation failed with exit code $LASTEXITCODE" }
}
finally {
  Pop-Location
}

Write-Host "== Documentation Generation Complete =="
