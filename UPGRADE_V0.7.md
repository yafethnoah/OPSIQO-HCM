# Upgrade to OPSIQO HCM v0.7.0

## 1. Back up first
Create verified Firestore and Storage backups before migration. Test restore procedures in a non-production environment.

## 2. Install dependencies and validate

```powershell
npm install --registry=https://registry.npmjs.org
npm run typecheck
npm test
npm run test:rules
npm run build
```

## 3. Configure Storage and scanning posture
Set the correct Firebase Storage bucket and keep client Storage writes denied. For production, integrate an approved scanner before enabling:

```env
OPSIQO_REQUIRE_CLEAN_DOCUMENT_SCAN=true
```

The application does not mark files clean by itself in production.

## 4. Deploy indexes/rules
Review then deploy `firestore.indexes.json`, `firestore.rules` and `storage.rules` in a non-production Firebase project first.

## 5. Migrate v0.6 evidence

```powershell
$env:OPSIQO_JOB_ORG_ID="YOUR_ORG_ID"
npm run documents:backfill
```

This migrates legacy published onboarding policies and promotes prehire evidence from already-activated onboarding cases. Operations are designed to be idempotent.

## 6. Configure retention rules
Do not copy demo retention periods into production without approval. Create the organization's approved schedule with a documented legal/business basis. Confirm which trigger applies to each record category.

## 7. Run governance review

```powershell
npm run retention:run
```

Review records moved to `pending_disposal`. The job does **not** auto-delete them. Legal hold blocks disposal.

## 8. Validate segregation and visibility
Test at minimum: HR Admin, HR Partner, Manager, Employee, and a worker with highly-confidential documents. Confirm manager access only works when the document itself permits manager visibility.

## 9. Policy lifecycle UAT
Use two different authorized identities to verify creator/approver segregation, publish a policy, acknowledge it as an employee, create a successor version, and verify old evidence remains intact.

## 10. E-signature decision
Authenticated policy acknowledgement is built in. If a document requires a specific higher-assurance signature process, connect the provider interface in `src/lib/compliance/esign.ts` and validate provider/webhook evidence before go-live.
