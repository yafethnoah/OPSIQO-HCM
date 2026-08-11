# Phase 4 v2.6 Production Acceptance — Privacy, Data Governance & AI Assurance

## Dependency/build gate
- [ ] Generate and commit a trusted `package-lock.json` from the approved npm registry.
- [ ] `npm ci` succeeds.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run test:rules` passes.
- [ ] `npm run build` passes.
- [ ] `npm run ai:evaluate`, `npm run ai:governance-check`, `npm run preflight:production`, and `npm run uat:lifecycle` pass.

## Privacy governance boundary
- [ ] Organization has named privacy/accountability ownership and approved jurisdiction mapping.
- [ ] Processing authority/lawful-basis notes are reviewed by qualified humans; OPSIQO does not infer legal authority.
- [ ] Privacy request due dates are recorded from qualified review, not automatically assumed from one statute.
- [ ] Breach notification decisions remain authorized human determinations.
- [ ] Cross-border transfer mechanisms/sufficiency remain qualified human determinations.
- [ ] Privacy/AI readiness score is described as operational only and is not presented as legal compliance certification.

## Data inventory / ROPA
- [ ] Active personal-data systems are represented in the privacy data inventory.
- [ ] Processing activities map purpose, data categories, data subjects, recipients, countries, vendors, safeguards and retention.
- [ ] Approved processing activities have independent review evidence.
- [ ] Consequential individual employment processing is not approved through the privacy center.

## Retention / assessments
- [ ] Retention schedules preserve trigger, period, disposition, source note, review date and legal-hold awareness.
- [ ] Retention schedules receive independent approval and periodic source review.
- [ ] DPIA/PIA/AIA/transfer/vendor assessments document data flow, inherent risks, mitigation and residual risks.
- [ ] High/critical residual risks are visible to authorized reviewers.
- [ ] Assessment creator/submitting reviewer cannot self-approve.

## Privacy requests
- [ ] Identity verification is documented before fulfillment where required by the organization procedure.
- [ ] Extensions/denials contain case-specific rationale and qualified review where required.
- [ ] Overdue requests create deduplicated governance notifications.
- [ ] Request evidence and audit logs follow approved retention/access controls.

## Incident/breach response
- [ ] Incident facts, affected data, estimated people affected, containment and investigation evidence are documented.
- [ ] Notification decision starts `pending_human_review` and cannot be auto-decided by AI or deterministic scoring.
- [ ] Notification decision requires `privacy.approve` and an independent reviewer.
- [ ] Required notification timestamps are present before incident closure when the approved decision requires notification.
- [ ] Root cause and remediation are documented before closure.

## Vendor / cross-border governance
- [ ] Vendors/processors have DPA/privacy-terms and security-review evidence.
- [ ] High/critical vendor risks are visible on the executive heatmap.
- [ ] Transfers cannot be approved without an approved transfer/privacy impact assessment.
- [ ] Vendor-linked transfers require an approved vendor.
- [ ] Transfer mechanism/authority note remains qualified-review evidence, not a system legal conclusion.

## AI assurance
- [ ] AI use cases document purpose, personal-data categories, countries, human oversight and prohibited uses.
- [ ] Consequential individual employment AI use cannot be approved.
- [ ] Automated/high-risk AI use requires an independently approved AIA/PIA/DPIA before approval.
- [ ] AI model-risk records assess privacy, security, bias, explainability and human-oversight risk.
- [ ] Approved AI model risks have a future reassessment date and overdue records are moved to `reassessment_due`.
- [ ] Existing v2.0 consequential-use guardrails continue to pass.

## RBAC / security
- [ ] `privacy.read/manage/approve/audit` permissions are tested.
- [ ] HR Partner has read/manage/audit but not `privacy.approve`.
- [ ] All v2.6 privacy collections and code indexes deny direct browser Firestore access.
- [ ] Privileged approval paths enforce production MFA/App Check policies where configured.
- [ ] Privacy actions write audit evidence.

## Operations
- [ ] `/privacy` loads for authorized HR/privacy roles.
- [ ] Privacy dashboard is included in lifecycle UAT.
- [ ] `npm run privacy:review` runs using an organization-scoped job identity.
- [ ] Recurring privacy review produces deduplicated notices for retention reviews, overdue assessments/requests, unresolved incident notification decisions, vendor reviews and AI-model reassessments.
