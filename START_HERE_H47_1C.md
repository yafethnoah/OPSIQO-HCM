# Start Here — OPSIQO H47.1C

Extract this package to a new folder. Do not overwrite H47.1B.

If PowerShell is already inside the extracted folder, do not run a guessed `Set-Location` command. Run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_H47_1C_VALIDATION.ps1
```

Expected final line:

`H47.1C OPSIQO EMPLOYEE MOBILE TOOLCHAIN COMPATIBILITY: PASS`

Production remains on hold until the full Windows gate and subsequent UAT mobile verification pass.
