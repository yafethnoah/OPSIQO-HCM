# OPSIQO HCM 8.5 V7.8 — Validation Report

Release: **8.5-V7.8-EMPLOYEE-PORTAL**
Production evidence foundation: **3.6.1**
Date: **2026-08-15**

## Fresh source/static validation completed in the packaging environment

| Gate | Result |
|---|---:|
| V7.8 Employee Portal source audit | PASS — 18/18 |
| V7.7 Automation-Max coverage audit | PASS — 21/21 |
| V7 People / Members import audit | PASS — 18/18 |
| OPSIQO 8.5 completion audit | PASS — 28/28 |
| Firestore Rules isolation audit | PASS — 12/12 |
| Settings prerender safety audit | PASS — 13/13 |
| Production preflight truth audit | PASS — 17/17 |
| Clean release packaging audit | PASS — 0 findings |
| TypeScript/TSX source syntax parse | PASS — 880 files, 0 syntax diagnostics |

The V7.8 audit verifies the dedicated employee route, permission-filtered employee services, self-scoped leave submission/history, self-scoped HR Service requests/tracking, backend worker scope, role-aware sign-in, role-aware invitation landing, safe deep-link precedence and employee privacy boundary.

## Security/governance result

The employee experience does not widen HR administration. Employee-role users continue to use self-service permissions only. Leave requests are bound to the authenticated membership's worker record and the authoritative backend rejects employee submissions for another worker. HR Service queries for non-HR users remain scoped to the authenticated worker. Human approval remains required where the existing domain workflow requires approval.

## Full semantic/runtime validation still required on Windows

A fresh `npm ci`, TypeScript semantic typecheck, Vitest suites, isolated Firestore Rules execution and Next.js production build were **not rerun in this packaging container**. An earlier npm-client failure in this environment terminated/reset the container while installing dependencies, so the packaging process intentionally did not repeat that unstable install path or claim semantic/runtime evidence it did not complete.

Run the included immutable validation runner on Windows from a fresh extracted copy:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_8_5_V7_8_EMPLOYEE_PORTAL_VALIDATION.ps1
```

That runner verifies the frozen manifest before installation, executes dependency, source, semantic test, Firestore Rules, production-build, security and production-preflight gates, then verifies the same frozen manifest again. It never regenerates `SOURCE_MANIFEST.sha256` during certification.
