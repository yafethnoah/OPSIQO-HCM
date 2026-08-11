# Upgrade to OPSIQO HCM v1.0.0

## From v0.9

1. Back up Firestore and Storage using your approved procedure.
2. Deploy the v1.0 source to a staging environment.
3. Install from the approved npm registry and create/review `package-lock.json`.
4. Run:

```powershell
npm run typecheck
npm test
npm run test:rules
npm run build
```

5. Deploy/review Firestore indexes and Rules.
6. Execute existing migrations if the tenant predates them:

```powershell
$env:OPSIQO_JOB_ORG_ID="YOUR_ORG_ID"
npm run backfill:search
npm run rebuild:occupancy
npm run documents:backfill
```

7. Run lifecycle diagnostics:

```powershell
npm run lifecycle:diagnose
```

8. Resolve critical findings before cutover.
9. Configure production security variables and run:

```powershell
npm run preflight:production
```

10. Run `npm run uat:lifecycle` against staging/UAT.
11. Seed or create notification templates appropriate to the organization.
12. Confirm separation replacement decisions can create draft requisitions without duplicates.
13. After a reviewed lockfile is committed, change CI/CD dependency installation to `npm ci`.

No destructive automatic migration is introduced by v1.0. The new lifecycle diagnostic runs, notification template registry and replacement dedupe records are additive server-managed collections.
