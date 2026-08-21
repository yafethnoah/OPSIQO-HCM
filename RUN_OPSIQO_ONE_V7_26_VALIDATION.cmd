@echo off
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0RUN_OPSIQO_ONE_V7_26_VALIDATION.ps1"
exit /b %ERRORLEVEL%
