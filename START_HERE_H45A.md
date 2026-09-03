# OPSIQO H45A — Start Here

H45A is the compatibility repair for H45 PDF intake classification.

## Windows validation

```powershell
Set-Location "D:\opsiqo\windows appweb\OPSIQO_H45A_FULL"
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_H45A_VALIDATION.ps1
```

Expected final line:

`H45A PDF SAFETY + UAT READINESS: PASS`

After validation, use `npm run dev:local` for local UAT or deploy the exact H45A source to UAT. Verify `/api/health` includes `patchRelease: H45A` before browser testing.
