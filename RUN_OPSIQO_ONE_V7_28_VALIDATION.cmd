@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0RUN_OPSIQO_ONE_V7_28_VALIDATION.ps1"
exit /b %ERRORLEVEL%
