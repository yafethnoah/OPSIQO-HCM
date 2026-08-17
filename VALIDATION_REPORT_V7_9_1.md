# OPSIQO HCM 8.5 V7.9.1 Stabilization Validation

## Scope
V7.9.1 is a stabilization release built from V7.9 Enterprise Self-Service. It closes the source-level P0/P1 findings from the V7.9 full audit without changing the established `3.6.1` production-evidence baseline.

## Applied repairs
- Repaired Performance workspace UTF-8/mojibake text.
- Added privacy-minimized `workerDirectory` projection and server-owned backfill utility.
- Restricted raw `workers` reads to HR or the linked employee; restricted assignment reads to HR, the employee, or the assigned manager.
- Added Content Security Policy and Cross-Origin-Resource-Policy response headers.
- Replaced broad manager manage permissions with team-scoped permission variants for recruiting, onboarding, time, PIP, and learning verification while preserving authoritative service scope checks.
- Added `production-*` branch triggers to standard quality/security/supply-chain CI workflows.
- Added the complete Firebase Web configuration contract to both production CI workflows.
- Added source-controlled `apphosting.yaml` with ADC and Secret Manager references.
- Added an hourly governed automation scheduler workflow using the protected automation endpoint and `scope: all`.
- Added explicit product release, certification baseline, and commit identity.
- Added worker-directory backfill, V7.9.1 source audit, V7.9.1 tests, and immutable Windows validation runner.

## Source-level validation completed in packaging environment
- V7.9.1 stabilization audit: **20/20 PASS**
- V7.9 Enterprise Self-Service audit: **15/15 PASS**
- V7.8 Employee Portal audit: **18/18 PASS**
- V7.7 Automation audit: **21/21 PASS**
- People / Members import audit: **18/18 PASS**
- ATS + Universal Import audit: **29/29 PASS**
- OPSIQO 8.5 completion audit: **28/28 PASS**
- Firestore Rules isolation audit: **12/12 PASS**
- Settings prerender audit: **13/13 PASS**
- Production preflight truth audit: **17/17 PASS**
- Dependency baseline against package + lockfile: **44 checks PASS**
- Clean release audit: **PASS**
- YAML syntax: **10 files / 0 parse errors**
- TypeScript/TSX parser validation: **940 files / 0 syntax diagnostics**

## Deep semantic/build validation status
A fresh `npm ci` was attempted in the packaging environment, but the dependency installation did not complete successfully. The partial `node_modules` tree was removed before packaging. Therefore this report does **not** claim fresh PASS evidence for semantic TypeScript, Vitest, Firestore emulator execution, Next.js production build, installed dependency baseline, or live `npm audit`.

Run `RUN_OPSIQO_8_5_V7_9_1_STABILIZATION_VALIDATION.ps1` on the Windows certification machine. It verifies the frozen manifest before installation and again after the full gate and never regenerates the manifest during certification.

## External production controls still required
Source configuration is now present, but production is still fail-closed until the real external controls are completed: GitHub branch protection/status checks; GitHub production variables/secrets; App Hosting Secret Manager values/access grants; nodejs22 and ABIU confirmation; automatic rollout control; App Check enforcement; privileged MFA; monitoring; PITR/backup and restore evidence; successful CI; controlled rollout; and authenticated production UAT.
