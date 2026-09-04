# Start Here — OPSIQO H47.1D

Extract the ZIP into a new folder. Do not overwrite H47.1C.

Open PowerShell in the extracted folder and run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_H47_1D_VALIDATION.ps1
```

Do not run a guessed `Set-Location` command if PowerShell is already in the extracted folder.

The required final result is:

`H47.1D OPSIQO EMPLOYEE MOBILE TAB ICON TYPE COMPATIBILITY: PASS`

Production remains on hold until the full Windows validation reaches that line and native UAT is completed.
