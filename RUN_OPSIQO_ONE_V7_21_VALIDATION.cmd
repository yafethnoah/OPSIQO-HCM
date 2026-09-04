@echo off
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0RUN_OPSIQO_ONE_V7_21_VALIDATION.ps1"
exit /b %ERRORLEVEL%
