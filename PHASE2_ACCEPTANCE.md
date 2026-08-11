# OPSIQO HCM Phase 2 v1.0 — Production Acceptance Checklist

A release is accepted only when every required gate below has evidence attached to the deployment/change record.

## 1. Dependency and build reproducibility

- [ ] Use the approved public/private npm registry.
- [ ] Run `npm install` once in the approved environment and generate `package-lock.json`.
- [ ] Review and commit `package-lock.json`.
- [ ] Change CI/CD install step from `npm install` to `npm ci`.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run test:rules` passes against Firebase Emulator Suite.
- [ ] `npm run build` passes.

## 2. Production preflight

- [ ] `npm run preflight:production` returns zero critical failures.
- [ ] Demo mode is disabled client and server side.
- [ ] Firebase project, Storage bucket and Admin credentials are supplied through approved secrets/configuration.
- [ ] App Check is enabled/enforced for the deployed web app/custom backend.
- [ ] Privileged HR/Admin MFA enforcement is enabled.
- [ ] Privileged identity-provider allow-list is reviewed.
- [ ] Clean document-scan enforcement is enabled and a real malware/DLP scanner is integrated.
- [ ] Automation job secret is high entropy and stored in a secret manager.
- [ ] All production URLs use HTTPS.

## 3. Firebase / data controls

- [ ] Deploy/review Firestore Rules.
- [ ] Deploy/review Storage Rules.
- [ ] Deploy all composite indexes.
- [ ] Emulator security tests confirm employee, manager, HR and server-only boundaries.
- [ ] Run worker-search backfill where upgrading older tenants.
- [ ] Run position-occupancy rebuild and resolve all drift before go-live.
- [ ] Run document-governance backfill for upgraded onboarding records.
- [ ] Review retention schedules and legal-hold procedures by jurisdiction/record class.

## 4. Lifecycle diagnostics

- [ ] Run `npm run lifecycle:diagnose` for each production tenant before cutover.
- [ ] Resolve all critical findings.
- [ ] Review high-severity findings and document accepted exceptions.
- [ ] Confirm no duplicate work identities.
- [ ] Confirm active workers have valid active employment and assignments.
- [ ] Confirm position occupancy matches effective-dated assignments.
- [ ] Confirm no silently overdue onboarding/offboarding controls.
- [ ] Confirm latest automation run is healthy.

## 5. Integrated UAT

Start the production-like environment and run:

```powershell
$env:OPSIQO_UAT_BASE_URL="https://YOUR-UAT-HOST"
$env:OPSIQO_UAT_ORG_ID="YOUR_ORG_ID"
$env:OPSIQO_UAT_ID_TOKEN="TEST_USER_FIREBASE_ID_TOKEN"
$env:OPSIQO_UAT_APP_CHECK_TOKEN="TEST_APP_CHECK_TOKEN"
npm run uat:lifecycle
```

- [ ] Health check passes.
- [ ] Identity and tenant membership resolve correctly.
- [ ] Lifecycle command center loads.
- [ ] Recruiting dashboard loads.
- [ ] Onboarding dashboard loads.
- [ ] Compliance dashboard loads.
- [ ] Leave/Time dashboard loads.
- [ ] Separation dashboard loads.
- [ ] Automation history loads.
- [ ] Role-specific manual UAT completed for Employee, Manager, HR Partner, HR Admin and Org Admin.

## 6. Lifecycle scenario acceptance

- [ ] Create and approve requisition.
- [ ] Candidate → application → structured interview → scorecard → offer.
- [ ] Accepted offer → prehire case → required documents/policies.
- [ ] Start-date activation creates one worker/employment/assignment and consumes correct position capacity.
- [ ] Employee document visibility is enforced.
- [ ] Leave request updates correct entitlement quantities.
- [ ] Time entry/timesheet produces correct policy-timezone week and exceptions.
- [ ] Separation closes employment/assignments only through authorized HR control.
- [ ] Post-exit payroll/ROE/benefits/retention tasks remain actionable after closure.
- [ ] Replacement decision can create exactly one draft replacement requisition.

## 7. Operational readiness

- [ ] Backup/restore procedure tested.
- [ ] Incident response contacts and escalation route documented.
- [ ] Logging/monitoring excludes secrets and unnecessary sensitive HR data.
- [ ] Notification/email delivery tested.
- [ ] Scheduled automation execution and alerting configured.
- [ ] Privacy/security/legal review completed for deployment jurisdictions.
- [ ] Change rollback plan approved.
