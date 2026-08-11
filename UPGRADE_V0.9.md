# Upgrade to OPSIQO HCM v0.9.0

## 1. Back up and validate

Export/back up Firestore and Storage according to the organization's existing recovery process. Run v0.8 acceptance tests before upgrading.

## 2. Install dependencies and validate

```powershell
npm install --registry=https://registry.npmjs.org
npm run typecheck
npm test
npm run test:rules
npm run build
```

## 3. Deploy Firestore configuration

v0.9 adds indexes for:

- separation case status/effective date
- worker-scoped case history
- manager-scoped case history
- separation task status/due date

Deploy the updated Firestore rules and indexes through the organization's controlled Firebase deployment process.

## 4. Review permissions

New permissions:

- `separation.read`
- `separation.request`
- `separation.manage`
- `separation.approve`
- `separation.close`
- `separation.analytics`

HR Partner intentionally does **not** receive approve/close authority. Employee/Manager receive relationship-scoped read/request only.

## 5. Configure separation governance

Before production use, approve:

- separation types/reason categories
- legal-review procedure
- payroll/final-pay handoff procedure
- ROE procedure and filing method/pay-cycle rules
- benefits handoff
- IT deprovisioning controls
- equipment/asset return process
- knowledge-transfer requirements
- exit interview confidentiality rules
- records-retention mapping

## 6. Schedule governance

For one organization:

```powershell
$env:OPSIQO_JOB_ORG_ID="YOUR_ORG_ID"
npm run separation:review
```

The normal shared automation cycle also runs separation governance before domain-event dispatch.

## 7. UAT before production

Complete every item in `PHASE2_ACCEPTANCE.md`. Keep `autoCloseOnEffectiveDate` disabled until closure readiness, payroll/IT handoffs and failure recovery have been validated in the target environment.

## Data migration

No destructive data migration is required from v0.8. v0.9 introduces new separation collections and indexes. Existing workers/assignments/positions remain the source of truth for employment closure and vacancy.
