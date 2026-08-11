# Upgrade to OPSIQO HCM v1.3.0

## From v1.2

1. Back up Firestore and Storage according to your normal release process.
2. Replace the v1.2 source with this v1.3 source while preserving production secrets outside the repository.
3. Install from the approved registry and commit the generated lockfile:

```powershell
npm install --registry=https://registry.npmjs.org
```

4. Deploy the updated Firestore indexes and Rules only after emulator tests pass. New server-only collections include:
   - `careerProfiles`
   - `careerReadinessPolicies`
   - `internalMobilityInterests`
   - `criticalPositions`
   - `successorNominations`
   - `talentAssessments`
5. Run the existing seed only in an emulator/demo environment if you want the v1.3 demonstration data.
6. Run:

```powershell
npm run typecheck
npm test
npm run test:rules
npm run build
npm run uat:lifecycle
```

7. Exercise `/career` with Employee, Manager, HR Partner and HR Admin identities.
8. Verify internal application handoff against a real open test requisition and confirm that hire conversion moves the linked mobility record to `converted`.
9. Set `OPSIQO_JOB_ORG_ID` and run:

```powershell
npm run career:review
```

10. Complete `PHASE3_ACCEPTANCE.md` before production deployment.

## No destructive migration

v1.3 adds new collections/indexes and extends existing recruiting/lifecycle behavior. It does not require destructive rewrites of Phase 2, Performance, Skills or LMS records. Existing recruiting hire conversion gains an idempotent internal-mobility reconciliation step when an application is linked to a mobility record.
