@echo off
setlocal

echo == Frontend: lint ==
cd /d D:\OPTO-PROFIT\frontend
call npm.cmd run lint
if errorlevel 1 goto :fail

echo == Frontend: build ==
call npm.cmd run build
if errorlevel 1 goto :fail

echo == Backend: unit tests ==
cd /d D:\OPTO-PROFIT\backend
call .\venv\Scripts\python.exe -m unittest discover -s tests -p test_*.py -v
if errorlevel 1 goto :fail

echo == Backend: live status probe ==
call .\venv\Scripts\python.exe .\scripts\health_probe.py
if errorlevel 1 goto :fail

echo == Project validation passed ==
exit /b 0

:fail
echo == Project validation failed ==
exit /b 1
