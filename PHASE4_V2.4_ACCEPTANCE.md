# Phase 4 v2.4 Production Acceptance — Policy & Regulatory Change Management

## Dependency / build gate
- [ ] Generate, review and commit `package-lock.json` from the approved registry/mirror.
- [ ] `npm ci` succeeds.
- [ ] `npm run release:gate` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run test:rules` passes.
- [ ] `npm run build` passes.

## Regulatory source governance
- [ ] Only approved HTTPS public sources are registered.
- [ ] Production egress policy prevents access to private/local networks and restricts outbound destinations as appropriate.
- [ ] `OPSIQO_REGULATORY_SOURCE_HOSTS` contains the approved comma-separated public host allowlist and `/api/health/ready` passes in production.
- [ ] Source authority, jurisdiction, owner, human-review cadence and monitor cadence are assigned.
- [ ] Initial source fingerprint is treated as a baseline, not as a change.
- [ ] Fingerprint differences create potential-change signals only.
- [ ] Human review is documented before accepting an observed snapshot as the new baseline.
- [ ] Source-review evidence is retained with the control/audit trail.

## Regulatory change workflow
- [ ] New change signals require human triage.
- [ ] Materiality, affected policies and affected controls are human-recorded.
- [ ] High/critical or fact-sensitive changes are routed to qualified review where required.
- [ ] No-action disposition requires independent `regulatory.approve` authority.
- [ ] Implementation closure requires independent approval.
- [ ] Closed changes can be reopened without deleting history.

## Obligation / control mapping
- [ ] Obligation statements preserve source lineage and applicability notes.
- [ ] `legalConclusionProhibited=true` remains mandatory on obligation records.
- [ ] Obligation approval is independent from creator/submitting reviewer.
- [ ] Linked policy/control IDs are reviewed for completeness.
- [ ] Fact-sensitive applicability remains a qualified-human conclusion.

## Policy impact and amendment
- [ ] Policy impact records identify exact regulatory change and policy.
- [ ] Policy-impact approval is independent from creator/submitting reviewer.
- [ ] A policy revision can only be created from an approved impact whose recommendation is `revise_policy`.
- [ ] Linked revision is created as a **draft**; existing policy approval/publish segregation remains required.
- [ ] Published revision preserves version, effective date and content SHA-256 evidence.

## Re-attestation
- [ ] Campaign targets an exact published policy version/content hash.
- [ ] Audience is snapshotted at creation.
- [ ] Campaign approval is independent from creator/submitting reviewer.
- [ ] Existing authenticated policy acknowledgement service remains the acknowledgement system of record.
- [ ] Campaign cannot close while required acknowledgements remain outstanding unless it is explicitly cancelled through authorized governance action.
- [ ] Overdue campaign counts are refreshed by `npm run regulatory:review`.

## Legal / specialist review queue
- [ ] Queue status does not represent legal advice by itself.
- [ ] Qualified reviewer identity/assignment is established organizationally.
- [ ] Clear/return outcomes require documented notes.
- [ ] Clearance is independently authorized in OPSIQO.
- [ ] Overdue high-priority review items generate governed notifications.

## Privacy / security
- [ ] Direct browser Firestore access is denied for all seven v2.4 collections.
- [ ] `regulatory.read/manage/approve/audit` permissions are tested.
- [ ] HR Partner does not receive `regulatory.approve`.
- [ ] Source monitor rejects HTTP, loopback, private-IP and local/internal host targets.
- [ ] Source fetch size/redirect limits are retained.
- [ ] Source snapshots store hashes/metadata, not copied legal webpage content.

## Integrated production gates
- [ ] `npm run ai:evaluate` passes.
- [ ] `npm run ai:governance-check` passes.
- [ ] `npm run preflight:production` passes.
- [ ] `npm run uat:lifecycle` includes `/regulatory` dashboard API.
- [ ] `npm run governance:review` passes for the target organization.
- [ ] `npm run diagnostic:review` passes for the target organization.
- [ ] `npm run regulatory:review` passes for the target organization.
