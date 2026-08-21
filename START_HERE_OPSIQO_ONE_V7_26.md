# Start Here — OPSIQO ONE V7.26

Release: **V7.26 · HCM v8.5 — Certification Environment & Translation Closure**

Overall roadmap/source progress: **98%**.

## Windows certification

Extract into a short new folder such as `D:\opsiqo\v726`, then run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_ONE_V7_26_VALIDATION.ps1
```

The runner does not deploy Firebase/App Hosting and does not intentionally print environment secret values. V7.26 also restores pre-existing Firebase/demo browser-UAT environment variables after its isolated emulator phase.

## Read next

- `OPSIQO_ONE_V7_26.md`
- `CHANGE_MANIFEST_OPSIQO_ONE_V7_26.md`
- `VALIDATION_REPORT_OPSIQO_ONE_V7_26.md`
- `NEXT_PHASE.md`

## Certification truth boundary

Source audit success is not the same as dependency-backed production certification. Deployment-certified status requires the Windows runner to pass completely on the target machine.
