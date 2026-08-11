# Phase 4 v2.1 Production Acceptance Checklist

## Dependency/build gate
- [ ] Generate and commit `package-lock.json` from approved registry
- [ ] `npm ci` succeeds
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] `npm run test:rules` passes
- [ ] `npm run build` passes

## Diagnostic framework governance
- [ ] Organization has an approved diagnostic framework owner
- [ ] Each compliance-reference control has jurisdiction, source title/URL and source review date
- [ ] Source-review cadence is assigned
- [ ] `legalConclusionProhibited=true` remains enforced for statutory controls
- [ ] Organization-specific controls are reviewed before activation
- [ ] Applicability rules are tested against representative organization profiles
- [ ] Manual applicability controls require human determination

## Evidence quality
- [ ] Evidence links resolve to trusted records or documented external references
- [ ] External references require URL or explanatory note
- [ ] Met/partial/not-met ratings include assessor rationale
- [ ] Evidence quality is visible separately from the control score
- [ ] No legal compliance conclusion is inferred from diagnostic score alone
- [ ] Evidence-retention/legal-hold interaction is reviewed

## Approval / segregation
- [ ] Assessment creator/submitting reviewer cannot self-approve
- [ ] Remediation-plan creator cannot self-approve
- [ ] Accepted-risk decisions require authorized HR-admin approval and rationale
- [ ] Reassessment creates a new assessment record rather than overwriting prior evidence

## Remediation governance
- [ ] Critical/high findings produce visible risk status
- [ ] Remediation plan has owner, due date and measurable KPI
- [ ] Open required tasks block plan completion
- [ ] Completed tasks alone do not resolve the finding; control reassessment or authorized risk acceptance is required before plan closure
- [ ] Completing a plan resolves the linked finding only through the governed service
- [ ] `npm run diagnostic:review` produces deduplicated overdue/reassessment notifications

## AI boundary
- [ ] Diagnostic AI analysis requires `ai.use`
- [ ] AI retrieves only permission-scoped diagnostic evidence
- [ ] Prompt/provider instructions prohibit legal compliance/non-compliance conclusions
- [ ] AI recommendations are non-consequential and remain human-reviewed
- [ ] Existing v2.0 consequential-use guardrails continue to pass (`npm run ai:evaluate`)

## Privacy/security
- [ ] Employee and manager roles do not have `diagnostic.read`
- [ ] HR Partner can assess/remediate but cannot approve
- [ ] HR Admin/Org Admin approval path is tested
- [ ] Direct Firestore reads/writes fail for diagnostic collections from employee, manager and HR browser clients
- [ ] Audit evidence records assessment, finding, accepted-risk and remediation changes

## Ontario reference-pack review
- [ ] Workplace violence/harassment controls reviewed against current OHSA guidance
- [ ] Electronic-monitoring policy control reviewed against current ESA threshold/timing rules
- [ ] 2026 publicly advertised job-posting control reviewed against current ESA posting/interview-notification rules
- [ ] Accessibility controls reviewed against current AODA organization-size/status obligations and reporting cycle
- [ ] Pay-equity applicability control reviewed against current Ontario Pay Equity Act scope
- [ ] JHSC/HSR applicability remains manual/qualified where special rules may apply

## Operational acceptance
- [ ] `/hr-diagnostic` loads for authorized HR roles
- [ ] `npm run uat:lifecycle` includes HR Diagnostic route
- [ ] Seed/demo clearly labels synthetic evidence
- [ ] Lifecycle Command Center exposes high/critical diagnostic findings only to authorized roles
- [ ] `npm run preflight:production` and AI governance checks pass
