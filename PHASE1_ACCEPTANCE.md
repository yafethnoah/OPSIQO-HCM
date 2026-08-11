# Phase 1 Production Acceptance Checklist

## Build and tests
- [ ] Clean dependency install succeeds.
- [ ] TypeScript typecheck passes.
- [ ] Unit tests pass.
- [ ] Firestore Rules emulator tests pass.
- [ ] Next.js production build passes.

## Data migration
- [ ] Firestore backup/export completed.
- [ ] Search keys backfilled for every organization.
- [ ] Position occupancy rebuilt and reconciled.
- [ ] Sample effective-dated histories manually verified.
- [ ] Sample secondary-assignment plans executed in staging.

## Identity and tenant security
- [ ] Demo mode disabled on server and client.
- [ ] Organization switch tested with a true multi-org user.
- [ ] Cross-organization access attempt denied.
- [ ] HR Partner cannot change organization/workflow administration data.
- [ ] Employee/manager private data boundaries verified.
- [ ] App Check registered and enforced if required.
- [ ] Privileged MFA enrollment/enforcement tested if required.
- [ ] SAML/OIDC provider and allow-list tested if required.

## Automation and operations
- [ ] Job secret stored in secrets management.
- [ ] Scheduled automation invocation configured.
- [ ] Failed automation run alerting configured.
- [ ] Scheduled employee change applies once.
- [ ] Scheduled secondary start/end applies once.
- [ ] Failed secondary plan can be retried after remediation.
- [ ] Workflow event dispatch remains idempotent on retry.
- [ ] SLA escalation creates expected evidence/notification.

## Notification and email
- [ ] Sender domain verified.
- [ ] Invitation email delivered successfully.
- [ ] Operational notification email delivered successfully.
- [ ] Email retry/failure behavior verified.
- [ ] Role/UID notification visibility verified.

## Governance
- [ ] Audit export verified.
- [ ] Firestore Rules and indexes deployed from source control.
- [ ] Service credentials are server-only.
- [ ] Retention/backup policy approved.
- [ ] Security review completed.
- [ ] HR/business UAT completed.
- [ ] Go-live owner approves Phase 1.
