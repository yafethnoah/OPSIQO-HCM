# Phase 3 v1.7 Production Acceptance Checklist

## Dependency/build gate
- [ ] `npm install --registry=https://registry.npmjs.org` succeeds.
- [ ] Commit generated `package-lock.json`.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run test:rules` passes against Firebase emulators.
- [ ] `npm run build` passes.

## Privacy/security
- [ ] `OPSIQO_SURVEY_ANONYMITY_SECRET` is unique, secret, rotated under an approved procedure and at least 32 characters.
- [ ] App Check enforcement is enabled for production APIs.
- [ ] Privileged HR/admin MFA is enabled.
- [ ] Firestore Rules deny direct client access to survey response, participation-index and HR-service collections.
- [ ] HR ticket content access is confirmed requester/authorized-HR only; managers cannot read direct-report tickets by relationship alone.
- [ ] Survey purpose/privacy notices have been reviewed.
- [ ] Survey retention/deletion schedule is approved.
- [ ] Small-group reporting risks and threshold choices are reviewed for each survey design.

## Survey UAT
- [ ] Draft survey can be created/edited.
- [ ] Anonymous threshold below 5 is rejected.
- [ ] Confidential/anonymous survey cannot publish if eligible population is below threshold.
- [ ] `eligibleCountAtPublish` is frozen on publication.
- [ ] Employee cannot submit twice.
- [ ] Anonymous response has no worker/user identity fields.
- [ ] Participation index is not client-readable.
- [ ] Aggregate result is suppressed below threshold.
- [ ] Closed threshold-qualified result is released as configured.
- [ ] Anonymous free-text control follows the stronger release rule.

## HR Service Center UAT
- [ ] Employee can create and view own request.
- [ ] Manager cannot view a direct report's private request.
- [ ] Non-HR requester cannot escalate priority through payload manipulation.
- [ ] Ticket reference number remains unique under concurrent requests.
- [ ] HR can assign/respond/pending/resolve/close/reopen/cancel according to state rules.
- [ ] Internal comments remain HR-only.
- [ ] Requester-visible comments are visible to requester.
- [ ] Satisfaction can be submitted once after resolution.
- [ ] First-response/resolution breach automation is deduplicated.
- [ ] Lifecycle Command Center shows scoped service risk.

## Operational acceptance
- [ ] Service catalog owners and service-level targets are approved.
- [ ] Calendar-hour SLA limitation is formally accepted or replaced with business-calendar logic before launch.
- [ ] Knowledge content ownership/review process is assigned.
- [ ] Recognition/idea moderation policy is approved.
- [ ] `npm run preflight:production` has no critical failures.
- [ ] `npm run uat:lifecycle` passes in staging with ID/App Check tokens.
