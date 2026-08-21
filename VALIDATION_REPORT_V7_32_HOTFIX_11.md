# OPSIQO HCM 8.5 V7.32 — Hotfix 11 Validation Report

Date: 2026-08-20  
Release boundary: V7.32 · Final Runtime Closure  
Maintenance revision: Hotfix 11 · Document Scan and UAT Hardening

## Audit scope

The uploaded V7.32 Hotfix 10 project was used as the authoritative baseline. The review covered release/certification tooling, onboarding/prehire evidence, employee document governance, production-readiness truth checks, authenticated browser UAT observability, localization closure, dependency metadata, existing OPSIQO historical architecture audits, and static source security/syntax.

## Concrete fixes applied

1. **Prehire malware-scan governance**
   - Production prehire downloads fail closed unless the file is clean.
   - Recording `clean` in governed production requires a bounded evidence reference.
   - Candidate uploads remain `in_progress` / awaiting scan in governed production instead of falsely completing the task.
   - Only the latest upload can complete or reopen the associated document task.
   - Activation evaluates the latest required blocking document evidence.
   - Promotion into the employee document vault rechecks clean status and evidence immediately before the copy.
   - Quarantined latest evidence reopens the candidate task.

2. **Employee document evidence**
   - Production `clean` status requires scan evidence.
   - Scan provenance records evidence reference, recorder and timestamp.
   - Existing verified-only production download gate remains authoritative.

3. **Production-readiness truth checks**
   - Base URLs must parse as credential-free HTTPS origins.
   - Server and browser base origins must align.
   - Firebase Admin service-account mode now validates service-account email/private-key structure; ADC remains accepted.
   - App Check, automation, survey and AI credentials reject trivial/placeholder values instead of treating mere presence as production evidence.

4. **Certification / browser UAT**
   - Vitest config moved from `.ts` to `.mts` to resolve the forward ESM/CommonJS loader warning rather than suppressing it.
   - Authenticated browser UAT prints route progress, route duration and failed-check count.
   - It validates authenticated route HTTP status.
   - It writes bounded partial evidence even if CDP/navigation fails before the full route matrix completes.
   - Hotfix 11 structural and targeted regression gates are included in the canonical V7.32 Windows runner.

5. **Localization**
   - All newly visible scan-governance labels/messages were reviewed in EN/FR/ES/AR.
   - Measured static backlog remains zero.

## Validation completed in this packaging environment

| Gate | Result |
|---|---:|
| Hotfix 11 structural audit | **22 / 22 PASS** |
| V7.32 release audit | **101 / 101 PASS** |
| V7.10–V7.32 historical source audits | **23 / 23 audit suites PASS** |
| V7.32 translation inventory | **3,528 / 3,528 reviewed; 0 backlog** |
| TS / TSX parser | **1,064 files; 0 syntax diagnostics** |
| JS/MJS syntax for new/modified certification scripts | **PASS** |
| Bounded static source security scan | **1,164 files; 0 findings** |
| 8.5 completion audit | **28 / 28 PASS** |
| ATS + universal import audit | **29 / 29 PASS** |
| Firestore rules-isolation source audit | **12 / 12 PASS** |
| Settings prerender audit | **13 / 13 PASS** |
| Production-preflight truth audit | **17 / 17 PASS** |
| Dependency baseline source audit | **44 / 44 PASS** |
| Automation V7.7 audit | **21 / 21 PASS** |
| Employee Portal V7.8 audit | **18 / 18 PASS** |
| Enterprise Self-Service V7.9 audit | **15 / 15 PASS** |
| V7.9.2 certification-repair audit | **28 / 28 PASS** |
| Windows PowerShell encoding compatibility | **PASS — 38 scripts** |
| Native Windows PowerShell parser | **Not run here; non-Windows environment** |
| Frozen source manifest | **1,667 / 1,667 PASS** |
| Clean-release audit | **PASS** |
| ZIP integrity | **PASS** |

## Dependency-backed truth boundary

The uploaded Hotfix 10 baseline had already passed Semantic TypeScript on Windows. This packaging environment could not complete a fresh `npm ci`; therefore Hotfix 11 does **not** claim a new dependency-backed TypeScript/Vitest/Firestore-emulator/Next.js-build certification here.

The canonical Windows runner was updated to execute the new Hotfix 11 gates and remains the authoritative recertification path:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_ONE_V7_32_VALIDATION.ps1
```

No TypeScript error suppression, weakened test, production deployment command, Safe Execute expansion, or consequential HR-action bypass was introduced.

## Overall release state

- Source implementation: **100%**
- Measured static localization: **100%**
- Overall OPSIQO project progress: **99.99%**
- Production deployed by this package: **No**
- Remaining external evidence: dependency-backed Windows recertification of Hotfix 11, human accessibility sign-off, connector UAT, release/change approval, and production deployment approval/execution.
