# Phase 4 v2.5 Production Acceptance — Compliance Evidence, Audit & Assurance

## Dependency / build gate
- [ ] Generate, review and commit `package-lock.json` from the approved npm registry/mirror.
- [ ] `npm ci` succeeds.
- [ ] `npm run release:gate` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes, including `assurance-governance.test.ts`.
- [ ] `npm run test:rules` passes.
- [ ] `npm run build` passes.

## Evidence vault / chain integrity
- [ ] Evidence source type and source-record references are validated against an allow-list for internal records.
- [ ] HTTPS is required for external evidence references.
- [ ] Existing governed source SHA-256 values are inherited/verified when available.
- [ ] Every evidence record has a genesis ledger entry and immutable metadata hash.
- [ ] Evidence lifecycle changes append ledger entries transactionally.
- [ ] Chain or immutable-metadata mismatch quarantines evidence and never silently rewrites history.
- [ ] Integrity verification is understood as vault metadata/ledger integrity, not a legal or substantive authenticity opinion.
- [ ] Legal hold prevents evidence expiry.
- [ ] Retention/legal-hold interaction has been reviewed by records/privacy/legal owners.

## Assurance planning / testing
- [ ] Plan creator/submitting reviewer cannot self-approve.
- [ ] Only active governance controls are used for control testing.
- [ ] Test results include rationale, evidence references and exception count.
- [ ] Test approval is independent from creator/submitting tester.
- [ ] Partial/ineffective approved tests have a documented finding before plan completion.
- [ ] Plan closure is blocked by unresolved findings except formally accepted risk.

## Audit sampling
- [ ] Sampling methodology is documented.
- [ ] Population count and digest are retained.
- [ ] Selection seed and selection digest are retained.
- [ ] Selected references are server-only and minimum-necessary.
- [ ] Judgmental samples document the organizational rationale outside the deterministic algorithm where required.
- [ ] Sample size/population suitability is reviewed by the responsible auditor/assurance owner.

## Evidence requests
- [ ] Evidence request has owner/role, scope detail and due date.
- [ ] Submitted evidence references only active/non-mismatched vault evidence.
- [ ] Acceptance is independently authorized.
- [ ] Returned requests retain rationale and history.
- [ ] Overdue requests produce deduplicated notifications.

## Findings / CAPA
- [ ] Findings document condition, criteria, cause, effect/risk and recommendation.
- [ ] High/critical finding ownership and due date are visible.
- [ ] Risk acceptance requires independent `assurance.approve` authority and documented rationale.
- [ ] CAPA approval is independent from creator/submitting reviewer.
- [ ] CAPA verification is independent from creator/completer.
- [ ] Finding validation requires linked CAPA to be verified/closed.
- [ ] Finding closure is independently authorized.

## Compliance calendar / reporting
- [ ] Calendar includes assurance plans/tests/requests/findings/CAPA plus governance, regulatory, policy and qualified-review due dates.
- [ ] Operational readiness score is labelled as management assurance/readiness only.
- [ ] No readiness score is represented as legal compliance, certification or an external audit opinion.
- [ ] Executive/Board report snapshots preserve the metrics/readiness state at creation time.
- [ ] Report approval is independent from creator/submitting reviewer.

## Privacy / security
- [ ] All v2.5 assurance collections and code indexes deny direct browser Firestore reads/writes.
- [ ] `assurance.read/manage/approve/audit` permissions are tested.
- [ ] HR Partner does not receive `assurance.approve`.
- [ ] Sensitive evidence/sample references are never placed in public/client-readable collections.
- [ ] Existing audit log and organization membership checks remain active on every server route.

## Integrated production gates
- [ ] `npm run ai:evaluate` passes.
- [ ] `npm run ai:governance-check` passes.
- [ ] `npm run preflight:production` passes.
- [ ] `npm run uat:lifecycle` includes the assurance dashboard API.
- [ ] `npm run governance:review` passes.
- [ ] `npm run diagnostic:review` passes.
- [ ] `npm run regulatory:review` passes.
- [ ] `npm run assurance:review` passes for the target organization.
