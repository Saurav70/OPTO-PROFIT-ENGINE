Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RootPath = "$PSScriptRoot\.."
$ReleaseDir = "$RootPath\release"
$ZipPath = "$ReleaseDir\OPTO-PROFIT_v1.0.0_Release.zip"

Write-Host "== Preparing Final Release Package =="
if (-not (Test-Path $ReleaseDir)) {
    New-Item -ItemType Directory -Path $ReleaseDir | Out-Null
}

$StagingDir = "$ReleaseDir\staging"
if (Test-Path $StagingDir) {
    Remove-Item -Recurse -Force $StagingDir
}
New-Item -ItemType Directory -Path $StagingDir | Out-Null

Write-Host "1. Copying Executable..."
Copy-Item "$RootPath\desktop\dist\OPTO-PROFIT.exe" "$StagingDir\" -Force

Write-Host "2. Copying Demo File..."
Copy-Item "$ReleaseDir\demo_factory_line.opto" "$StagingDir\" -Force

Write-Host "3. Copying Documentation..."
Copy-Item "$RootPath\docs" "$StagingDir\docs" -Recurse -Force

Write-Host "4. Creating README.txt..."
$ReadmeContent = @"
OPTO-PROFIT (v1.0.0 Release)
----------------------------

1. Launch OPTO-PROFIT.exe.
2. The application is completely offline and standalone. No installation is required.
3. Upon opening the app, create a local user profile.
4. Drag and drop the included 'demo_factory_line.opto' file into the UI to instantly load a sample project (Digital Oscilloscope Production).

For detailed technical and user documentation, open the 'docs/' folder and view 'project_documentation.md' or the generated 'source_code/' HTML files.
"@
Set-Content -Path "$StagingDir\README.txt" -Value $ReadmeContent

Write-Host "5. Zipping Archive..."
if (Test-Path $ZipPath) {
    Remove-Item -Force $ZipPath
}
Compress-Archive -Path "$StagingDir\*" -DestinationPath $ZipPath -Force

Write-Host "6. Cleaning Up Staging..."
Remove-Item -Recurse -Force $StagingDir

Write-Host "== Release Package Created Successfully at $ZipPath =="
