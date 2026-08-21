# START HERE — OPSIQO ONE v7.15

This package is the full OPSIQO HCM 8.5 / OPSIQO ONE v7.15 source release.

## What v7.15 adds
- Unified Human + Digital Workforce registry
- Grant / Nonprofit Workforce Intelligence
- Employee Service Center
- Meeting → Action private drafts
- Daily Brief 2.0 proactive signals
- Intelligent notification consolidation

## Certification status
Source-level architecture/regression/static validation is included in `VALIDATION_REPORT_OPSIQO_ONE_V7_15.md`.

The packaging runtime is intentionally **not** treated as proof of dependency-backed certification because the registry-dependent install destabilized/reset the packaging session. Run the supplied Windows verifier on the normal OPSIQO machine/CI before promotion.

## Windows certification
From the extracted project root:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_ONE_V7_15_VALIDATION.ps1
```

The runner verifies the frozen source before `npm ci`, then executes the V7.15 contract, all OPSIQO ONE regressions, TypeScript, targeted/full tests, Firestore Rules, static security scan, production build, release gate and final manifest verification.

It performs no Firebase/App Hosting deployment and does not intentionally print secrets.

## Suggested UAT
1. Unified Workforce — confirm HRIS humans and authorized digital agents remain distinct.
2. Grant Workforce — create funding source and allocation.
3. Try an overlapping allocation above 100% and confirm rejection.
4. Try an allocation outside the funding period and confirm rejection.
5. Employee Service Center — search knowledge and submit an HR service request.
6. Meeting → Action — create a private draft, review it, archive it; confirm no personnel record is created.
7. Daily Brief — verify notification grouping and authorized funding-expiry signals.
8. Ask OPSIQO — verify new routing and consequential-action blocking.
9. Re-test MFA and organization switching before UAT promotion.
