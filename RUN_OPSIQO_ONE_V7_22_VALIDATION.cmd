@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0RUN_OPSIQO_ONE_V7_22_VALIDATION.ps1"
exit /b %ERRORLEVEL%
