@echo off
echo ========================================
echo   OPTO-PROFIT Desktop Build Wrapper
echo ========================================
echo Bypassing execution policy to run build.ps1...
powershell -ExecutionPolicy Bypass -File "%~dp0build.ps1" %*
pause
