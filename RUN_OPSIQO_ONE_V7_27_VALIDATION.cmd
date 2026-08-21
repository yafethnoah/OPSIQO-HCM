@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0RUN_OPSIQO_ONE_V7_27_VALIDATION.ps1"
exit /b %ERRORLEVEL%
