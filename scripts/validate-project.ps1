Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "== Frontend: lint =="
Push-Location "D:\OPTO-PROFIT\frontend"
try {
  npm.cmd run lint
  if ($LASTEXITCODE -ne 0) { throw "Frontend lint failed with exit code $LASTEXITCODE" }
  Write-Host "== Frontend: build =="
  $buildSucceeded = $false
  for ($attempt = 1; $attempt -le 2 -and -not $buildSucceeded; $attempt++) {
    npm.cmd run build
    if ($LASTEXITCODE -eq 0) {
      $buildSucceeded = $true
    }
    else {
      if ($attempt -eq 2) { throw "Frontend build failed after retry with exit code $LASTEXITCODE" }
      Write-Host "Frontend build failed on attempt $attempt, retrying once..."
      Start-Sleep -Seconds 2
    }
  }
}
finally {
  Pop-Location
}

Write-Host "== Backend: unit tests =="
Push-Location "D:\OPTO-PROFIT\backend"
try {
  .\venv\Scripts\python.exe -m unittest discover -s tests -p "test_*.py" -v
  if ($LASTEXITCODE -ne 0) { throw "Backend unit tests failed with exit code $LASTEXITCODE" }

  Write-Host "== Backend: live status probe =="
  $job = Start-Job -ScriptBlock {
    Set-Location "D:\OPTO-PROFIT\backend"
    .\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001
  }

  try {
    $probePassed = $false
    for ($attempt = 1; $attempt -le 3 -and -not $probePassed; $attempt++) {
      Start-Sleep -Seconds 3
      try {
        $resp = Invoke-WebRequest -Uri "http://127.0.0.1:8001/api/status" -UseBasicParsing -TimeoutSec 10
        if ($resp.StatusCode -eq 200) {
          $probePassed = $true
          Write-Host "Backend status probe passed: $($resp.Content)"
        }
      }
      catch {
        if ($attempt -eq 3) { throw }
      }
    }
    if (-not $probePassed) { throw "Backend status probe failed after retries" }
  }
  finally {
    Stop-Job $job -ErrorAction SilentlyContinue | Out-Null
    Receive-Job $job -Keep -ErrorAction SilentlyContinue | Out-Null
    Remove-Job $job -Force -ErrorAction SilentlyContinue
  }
}
finally {
  Pop-Location
}

Write-Host "== Project validation passed =="
