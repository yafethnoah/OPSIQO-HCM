# OPSIQO H46 — Start Here

1. Extract to a new folder. Do not overwrite H45B.
2. On Windows PowerShell:

```powershell
Set-Location "D:\opsiqo\windows appweb\OPSIQO_H46_FULL"
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_H46_VALIDATION.ps1
```

3. The authoritative final line must be:

`H46 SMART TIME + ATTENDANCE + EXPENSE INTELLIGENCE: PASS`

4. Only after the Windows PASS, promote the exact H46 snapshot to a new Git release branch and deploy to UAT only.
5. Verify `/api/health` reports `featureRelease: H46` and `patchRelease: H46` before browser UAT.

Browser UAT should cover geofenced clocking, offline queue/sync, explicit breaks, manager shift scheduling, leave-conflict protection, overtime watch, live attendance, attendance photo proof, expense submission/approval/export, and regression of H45B Recruiting.
