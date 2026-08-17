# OPSIQO HCM 8.5 V7.9.3.2 — Manager Navigation Audit Compatibility Hotfix

## Scope

This hotfix resolves a certification-audit mismatch discovered after V7.9.3.1 successfully passed TypeScript, 321/321 Vitest tests, 40/40 isolated Firestore Rules tests, the Next.js production build, security static scan, lockfile review, V7.9.2 certification-repair audit, V7.9.3 UX closure audit, and ATS/import audit.

## Root cause

V7.9.3 intentionally renamed the primary manager navigation label from `Manager Portal` to `My Team` while preserving the `/manager` route and `team.read` permission boundary. The older V7.9 enterprise self-service audit still required the literal label `Manager Portal`, so it reported a false failure even though the manager workspace was present, role landing was correct, and V7.9.3 UX validation had already confirmed `My Team` remained permission-scoped.

## Repair

The enterprise self-service audit now accepts the current `My Team` label (and the historical `Manager Portal` label for backward compatibility), while also requiring:

- `href:'/manager'`
- `permission:'team.read'`

This preserves the V7.9.3 simplified information architecture without weakening the manager scope boundary.

## Security and functional impact

No application runtime behavior, Firestore rule, API authorization logic, HR workflow, ATS logic, or production-readiness control is loosened by this change. This is an audit-compatibility repair only.
