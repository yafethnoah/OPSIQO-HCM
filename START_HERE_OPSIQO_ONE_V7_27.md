# Start Here — OPSIQO ONE V7.27

Release: **V7.27 · HCM v8.5 — Final Certification & Translation Closure**

Overall roadmap/source progress: **99%**.

## Windows certification

Extract into a short, clean, non-synced folder such as `D:\opsiqo\v727`, then run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_ONE_V7_27_VALIDATION.ps1
```

The runner does not deploy Firebase/App Hosting and does not intentionally print environment secret values. It restores the pre-existing browser/emulator environment after isolated UAT and produces a sanitized gate ledger plus a dependency-free first-failure summary.

## Read next

- `OPSIQO_ONE_V7_27.md`
- `CHANGE_MANIFEST_OPSIQO_ONE_V7_27.md`
- `VALIDATION_REPORT_OPSIQO_ONE_V7_27.md`
- `NEXT_PHASE.md`

## Certification truth boundary

Source audit success is not dependency-backed production certification. Deployment-certified status requires the Windows runner to pass completely, representative manual accessibility review to close, and approved real connector UAT evidence to be accepted.
