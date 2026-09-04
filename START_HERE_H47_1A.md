# START HERE — OPSIQO H47.1A

H47.1A repairs the H47.1 Windows certification failure without weakening mobile or HR governance.

## Recommended folder

Use a new folder; do not overwrite H47.1:

`D:\opsiqo\windows appweb\OPSIQO_H47_1A`

## Run

```powershell
Set-Location "D:\opsiqo\windows appweb\OPSIQO_H47_1A"
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_H47_1A_VALIDATION.ps1
```

Expected final line:

`H47.1A OPSIQO EMPLOYEE MOBILE CERTIFICATION REPAIR: PASS`

## Important

Do not deploy H47.1A to production directly. After Windows certification, promote the exact clean source to the UAT branch, deploy UAT only, verify `/api/health` reports `featureRelease: H47` and `patchRelease: H47.1A`, and then run mobile + web UAT.
