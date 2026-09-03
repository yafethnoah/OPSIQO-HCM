# H45A Validation Report

## Packaging-environment checks

- H45 base static audit: 31/31 PASS
- H45A PDF classification static audit: 8/8 PASS
- H41 safety contract preserved by source inspection
- H45 scanned-resume setup guidance preserved by source inspection
- H45A runtime patch identity added

## Windows semantic gate

Run `RUN_OPSIQO_H45A_VALIDATION.ps1`. It performs dependency installation if needed, H45 + H45A audits, TypeScript, targeted recruiting regressions, full Vitest, Firestore Rules, production build, and source-manifest verification.

The packaging environment did not complete a fresh npm dependency install within its execution window, so semantic TypeScript/build/test PASS is intentionally left for the Windows certification run rather than claimed here.
