# OPSIQO HCM 8.5 V7.1 code-gate repair

## Failure reproduced from Windows validation

The V7 validation was run after `npm audit fix --force`. npm rewrote the tested direct dependency baseline, including Firebase Admin and Firebase CLI versions. The subsequent `npm ci` therefore installed a different API surface than the V7 source was written and locked against.

That dependency drift explains the two Firebase Admin / Firestore TypeScript failures:

- `getFirestore(app, databaseId)` overload unavailable on the downgraded installed Admin SDK.
- Firestore aggregation `.count()` unavailable on the downgraded installed Firestore API surface.

A third TypeScript failure was independent and real in V7:

- `recruiting.ats_review_completed` was emitted by ATS review service but had not been added to the shared `DomainEventType` / `WorkflowTrigger` contract.

## V7.1 repair

- Restores the signed direct dependency baseline: `firebase-admin@14.2.0`, `firebase-tools@15.26.0`, and all other exact V7 versions.
- Adds `recruiting.ats_review_completed` to the typed workflow event contract, workflow schema and workflow UI trigger list.
- Adds a regression test for the ATS event contract.
- Adds a dependency-baseline audit that checks package.json, package-lock.json and (after `npm ci`) installed direct dependency versions.
- Updates validation so dependency drift fails before TypeScript/build gates.
- Adds an explicit release policy forbidding `npm audit fix --force` on release candidates. Vulnerabilities must be remediated by a controlled dependency upgrade with full validation.

## Windows validation

```powershell
powershell.exe `
  -NoLogo `
  -NoProfile `
  -ExecutionPolicy Bypass `
  -File ".\RUN_OPSIQO_8_5_V7_1_VALIDATION.ps1"
```
