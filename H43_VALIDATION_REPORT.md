# OPSIQO H43 validation report

## Source-level validation completed in packaging environment

- H43 static architecture/recruiting audit: **16 / 16 PASS**
- Deterministic resume parser smoke test: **PASS**
  - input filename: `ResumeJiaYeeTan.pdf`
  - extracted display name: `Jia Yee Tan`
  - first name: `Jia`
  - last name: `Tan`
  - email/location evidence: correctly extracted in smoke fixture
- Modified TypeScript/TSX syntax scan: **no syntax diagnostics detected**
- Source manifest: **PASS**
- Secret-like path review: only `.env.example`; no `.env.local`, private-key, service-account-key or credential file was introduced
- No packaged `.git`, `node_modules`, `.next` or cache directories

## Full semantic validation still required on the normal OPSIQO Windows/CI environment

A fresh dependency installation did not complete inside the packaging container. The partial install was terminated and removed before packaging. Therefore this environment does **not** claim fresh completion of:

- full semantic TypeScript typecheck;
- Vitest suite;
- Firestore Rules tests;
- Next.js production build;
- release/security gates.

Run `RUN_OPSIQO_H43_VALIDATION.ps1` after extraction. It fails closed on the H43 audit, TypeScript, targeted recruiting regressions, full Vitest, production build, and source-manifest verification.

## UAT focus

The most important live regression is the stale-state defect observed in the H42 recording. Verify that requisition status and pipeline counters change immediately and remain correct after React updates and locale changes.
