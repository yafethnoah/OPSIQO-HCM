# Upgrade to OPSIQO HCM v1.4.0

## From v1.3

1. Back up Firestore and Storage.
2. Replace v1.3 application source while preserving production secrets outside the repository.
3. Install dependencies and commit the generated lockfile:

```powershell
npm install --registry=https://registry.npmjs.org
```

4. Run `npm run typecheck`, `npm test`, `npm run test:rules`, and `npm run build`.
5. Deploy Firestore indexes/rules only after emulator tests pass.
6. Review new permissions: `compensation.read`, `compensation.manage`, `compensation.approve`, `jobarchitecture.manage`, `payequity.review`.
7. Configure salary bands/job architecture and approved market sources. Do not infer legacy salary values.
8. Recover offer-sourced compensation baselines where applicable:

```powershell
$env:OPSIQO_JOB_ORG_ID="YOUR_ORG_ID"
npm run compensation:backfill-offers
```

9. Review Ontario/reference pay-transparency and pay-equity configurations against the organization's actual jurisdiction, headcount, establishment/job-class facts, collective agreements and legal advice.
10. Run `npm run uat:lifecycle` and test `/compensation` with Employee, Manager, HR Partner and HR Admin identities.
11. Run compensation governance:

```powershell
npm run compensation:review
```

12. Reconcile any applied compensation changes with the production payroll system before go-live.
