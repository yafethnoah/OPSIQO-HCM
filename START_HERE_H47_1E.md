# Start Here — OPSIQO H47.1E

Extract this package into a new folder. Do not overwrite H47.1D.

Open PowerShell in the extracted project folder and run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_H47_1E_VALIDATION.ps1
```

Do not manually install mobile packages first. The validator creates and removes an isolated temporary Employee Mobile workspace automatically.

Required final line:

`H47.1E OPSIQO EMPLOYEE MOBILE EXPO DOCTOR ISOLATION: PASS`
