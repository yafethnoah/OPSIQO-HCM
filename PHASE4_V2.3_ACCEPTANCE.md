# Phase 4 v2.3 Production Acceptance — Enterprise HR Governance & Control Center

## Dependency/build gate
- [ ] `package-lock.json` generated and committed from approved registry
- [ ] `npm ci` succeeds
- [ ] `npm run release:gate` passes
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] `npm run test:rules` passes
- [ ] `npm run build` passes

## Governance control register
- [ ] `/governance` is visible only to roles with `governance.read`
- [ ] HR Partner has read/manage but not approve authority
- [ ] new controls begin in draft status
- [ ] activation requires review and an independent approver
- [ ] statutory/reference controls preserve `legalConclusionProhibited=true`
- [ ] source review date, cadence and next-review date are visible
- [ ] linked policy/diagnostic-control lineage is retained

## Attestations
- [ ] attestations can only be scheduled against active controls
- [ ] submission is limited to assigned role or governance approver
- [ ] evidence references and response note are retained
- [ ] submitter cannot approve their own attestation
- [ ] overdue attestations remain visibly overdue until actioned

## Exceptions
- [ ] exception requires rationale, risk level, mitigation, owner and expiry
- [ ] expiry cannot precede start date
- [ ] exception approval is independent of creator/submitter
- [ ] expired exceptions are not silently treated as approved
- [ ] close/reopen actions are audited

## Enterprise HR risk
- [ ] likelihood and impact use a controlled 1–5 scale
- [ ] score and level are derived deterministically
- [ ] accepted risk requires documented reason and independent approval
- [ ] risk closure requires authorized independent review
- [ ] treatment plan and target date remain visible

## Security/audit
- [ ] governanceControls is server-only in Firestore
- [ ] governanceAttestations is server-only in Firestore
- [ ] governanceExceptions is server-only in Firestore
- [ ] governanceRisks is server-only in Firestore
- [ ] all governance mutations write audit evidence
- [ ] bootstrap is idempotent and does not exceed Firestore write-batch limits

## Automation/operations
- [ ] `npm run governance:review` runs for an organization
- [ ] source-review due notifications are deduplicated
- [ ] overdue attestation notifications are deduplicated
- [ ] exception expiry notifications are deduplicated
- [ ] lifecycle UAT includes the Governance dashboard
- [ ] v2.2 production readiness gates remain mandatory
