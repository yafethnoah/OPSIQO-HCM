# Phase 1 Status — Enterprise Foundation v0.4.0

## Core HR — complete in code
- [x] Person → Worker → Employment → Assignment data model
- [x] Organization units and positions
- [x] Employee directory/profile/timeline
- [x] Cursor pagination and normalized prefix search
- [x] Search-key backfill migration
- [x] Effective-dated transfer/promotion/manager/status changes
- [x] Durable future employee changes + executor
- [x] Primary and concurrent assignments
- [x] Future secondary-assignment starts/ends + executor
- [x] Secondary-plan cancel and failed-plan retry
- [x] Allocation FTE
- [x] Headcount/FTE occupancy
- [x] Transactional capacity enforcement
- [x] Occupancy rebuild migration
- [x] Manager hierarchy and cycle prevention
- [x] Position/org-unit validation

## Tenancy / identity / security — complete in code
- [x] Organization-scoped memberships
- [x] Multi-organization discovery and switcher
- [x] Active organization propagation
- [x] Server-side membership/permission enforcement
- [x] Permission-aware navigation
- [x] Manager private-data boundary
- [x] Firebase ID-token verification
- [x] Revoked-token check outside Auth emulator mode
- [x] App Check client/header/backend verification hooks
- [x] Privileged-role MFA enforcement hook
- [x] Privileged sign-in-provider allow-list hook
- [x] Security posture page
- [x] Firestore Rules aligned with API RBAC
- [x] Employee self-service
- [x] Manager workspace

## Workflow / automation — complete in code
- [x] Versioned workflow definitions
- [x] Manual + domain-event triggers
- [x] Durable domain-event outbox
- [x] Idempotent dispatch marker
- [x] Retry ceilings / terminal failure evidence
- [x] Immutable run step snapshot
- [x] Task start/completion
- [x] Approval/rejection
- [x] Dependency release and cycle validation
- [x] Persisted progress percentage
- [x] Step SLA / overdue / escalation
- [x] Automation control UI
- [x] Automation run observability
- [x] Internal scheduler endpoint + local CLI

## Membership / notifications / governance — complete in code
- [x] Secure invitation issue/acceptance
- [x] Resend with token rotation
- [x] Revoke
- [x] Role-escalation prevention
- [x] In-app notification inbox/read state
- [x] Notification administration policy
- [x] Operational notification email delivery + retries
- [x] Audit filters
- [x] Authenticated CSV audit export
- [x] Rules emulator test suite authored
- [x] Pinned development dependency versions

## Deliberately deferred to Phase 2
- [ ] Digest email generation/delivery
- [ ] ATS/recruitment
- [ ] Onboarding/offboarding journey templates
- [ ] Leave/time/attendance
- [ ] Document/policy management
- [ ] Advanced notification channels (push/Teams/Slack)

## Production deployment acceptance — must still be executed
- [ ] `npm install` succeeds in deployment CI/workstation
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run test:rules`
- [ ] `npm run build`
- [ ] Production Firestore indexes/rules deployed
- [ ] Search backfill and occupancy rebuild rehearsal completed
- [ ] Demo mode disabled
- [ ] App Check registered/enforced
- [ ] Identity Platform SAML/OIDC configured if required
- [ ] Privileged MFA enrolled/enforced if required
- [ ] Secrets/email domain/scheduler/monitoring configured
- [ ] Security + UAT sign-off

**Phase 1 development status:** feature foundation complete; production acceptance pending real-environment validation/configuration.
