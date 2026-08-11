# Upgrade to OPSIQO HCM v2.2 — Production Readiness & Release Engineering

## What changed
- Corrected the stale Phase 1 service identity on the health endpoint.
- Added a non-secret readiness evaluator and `GET /api/health/ready`.
- Added explicit production configuration mismatch checks for Firebase project/bucket values.
- Added release-version metadata and Node.js engine declaration.
- Added a deterministic `release:gate` command.
- Added CI quality-gate workflow for lockfile-based install, typecheck, tests, Rules tests, build and AI evaluation.
- Added a production deployment/rollback runbook.
- Strengthened baseline security response headers without weakening Next.js runtime behavior.

## Required action before production
The dependency lockfile remains a hard gate. Generate and commit `package-lock.json` from an approved npm registry, then execute the full production acceptance command set.
