# Upgrade to OPSIQO HCM v2.1

## 1. Install and validate
```powershell
npm install --registry=https://registry.npmjs.org
npm run typecheck
npm test
npm run test:rules
npm run build
```

## 2. Environment
Optional diagnostic reassessment cadence:
```env
OPSIQO_DIAGNOSTIC_DEFAULT_REVIEW_DAYS=365
```
The service clamps the configured value to at least 30 days.

## 3. Deploy Firestore rules/indexes
Deploy the updated Firestore Rules and indexes through your normal approved Firebase deployment path. Diagnostic collections are server-only.

## 4. Bootstrap framework
Use the HR Diagnostic workspace (`/hr-diagnostic`) with an HR Admin/Org Admin account and install the Ontario reference framework, or run the normal seed only in an approved non-production environment.

## 5. Configure applicability profile
For each assessment, record the organizational facts used for screening, including current workforce count, Ontario January-1 workforce count, sector/regulation context and public-sector status where relevant. Manual controls remain pending until a qualified reviewer records applicability.

## 6. Link evidence
Link trusted OPSIQO records (policies, governed documents, learning, safety, compensation, ER, time, analytics) or approved external references. Do not mark a control met solely because a policy title exists; evaluate the evidence against the control requirement.

## 7. Governance automation
```powershell
$env:OPSIQO_JOB_ORG_ID="YOUR_ORG_ID"
npm run diagnostic:review
```
Add this command to the approved automation schedule if the diagnostic governance module is enabled.

## 8. Production acceptance
Run:
```powershell
npm run ai:evaluate
npm run ai:governance-check
npm run preflight:production
npm run uat:lifecycle
```
Confirm HR Diagnostic appears in lifecycle UAT and employee/manager clients cannot directly read diagnostic Firestore collections.
