@echo off
setlocal

set DOC_ROOT=%~dp0..\docs\source_code
set BACKEND_DOC_DIR=%DOC_ROOT%\backend
set FRONTEND_DOC_DIR=%DOC_ROOT%\frontend

echo == Cleaning previous documentation ==
if exist "%BACKEND_DOC_DIR%" ( rd /s /q "%BACKEND_DOC_DIR%" )
mkdir "%BACKEND_DOC_DIR%"
if exist "%FRONTEND_DOC_DIR%" ( rd /s /q "%FRONTEND_DOC_DIR%" )
mkdir "%FRONTEND_DOC_DIR%"

echo == Generating Backend Docs (pdoc) ==
cd /d "%~dp0..\backend"
call .\venv\Scripts\python.exe -m pdoc ./app -o "%BACKEND_DOC_DIR%"
if errorlevel 1 goto :fail

echo == Generating Frontend Docs (jsdoc) ==
cd /d "%~dp0..\frontend"
call npm run docs
if errorlevel 1 goto :fail

echo == Documentation Generation Complete ==
exit /b 0

:fail
echo == Documentation Generation Failed ==
exit /b 1
