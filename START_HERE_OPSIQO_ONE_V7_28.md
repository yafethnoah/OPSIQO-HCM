# Start Here — OPSIQO ONE V7.28

Release: **V7.28 · HCM v8.5 — Deployment Readiness & Translation Closure**

Overall roadmap/source progress: **99.5%**.

## Windows certification

Extract into a short, clean, non-synced folder such as `D:\opsiqo\v728`, then run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_ONE_V7_28_VALIDATION.ps1
```

The runner does not deploy Firebase/App Hosting and does not intentionally print environment secret values. It produces a sanitized gate ledger, a first-failure summary, and a deployment-readiness report that keeps automated evidence separate from manual accessibility, connector-UAT and production-deployment sign-offs.

## Read next

- `OPSIQO_ONE_V7_28.md`
- `CHANGE_MANIFEST_OPSIQO_ONE_V7_28.md`
- `VALIDATION_REPORT_OPSIQO_ONE_V7_28.md`
- `NEXT_PHASE.md`

## Certification truth boundary

Source audit success is not dependency-backed production certification. Deployment-certified status requires the complete Windows runner, representative manual accessibility review, approved real connector UAT, and explicit controlled production deployment evidence.
