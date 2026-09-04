# OPSIQO H45 — Start Here

1. Extract the full project to a short Windows path, for example:
   `D:\opsiqo\windows appweb\OPSIQO_H45_FULL`
2. Open PowerShell in that folder.
3. Run:
   `Set-ExecutionPolicy -Scope Process Bypass -Force`
4. Run:
   `.\RUN_OPSIQO_H45_VALIDATION.ps1`
5. Do not deploy until the runner ends with:
   `H45 STABILIZATION + UAT READINESS: PASS`
6. Deploy the exact validated H45 source to UAT.
7. Confirm `/api/health` shows `featureRelease: H45` and the Recruiting readiness card shows H45 before performing browser UAT.

H45 intentionally does not auto-approve Recruiting AI governance, auto-open requisitions, auto-close duplicate requisitions, or make employment decisions.
