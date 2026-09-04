# Start Here — OPSIQO H47.1F

This package is a **lock-capture bootstrap** built from certified H47.1E. Do not overwrite H47.1E.

On Windows, open PowerShell in the extracted H47.1F folder and run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\FREEZE_OPSIQO_H47_1F_MOBILE_LOCK.ps1
```

The script will generate the mobile lockfile, regenerate and verify the source manifest, run the full H47.1F certification with `npm ci`, and create the final frozen ZIP in the parent folder.

Expected final certification line:
`H47.1F OPSIQO EMPLOYEE MOBILE REPRODUCIBLE BUILD BASELINE: PASS`
