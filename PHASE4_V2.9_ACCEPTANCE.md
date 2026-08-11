# OPSIQO HCM v2.9 Production Acceptance Checklist

## Dependency/build gate
- [ ] Generate and review `package-lock.json` from approved registry
- [ ] Commit the trusted lockfile
- [ ] `npm ci` succeeds
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] `npm run test:rules` passes
- [ ] `npm run build` passes
- [ ] `npm run ai:evaluate` passes
- [ ] `npm run ai:governance-check` passes
- [ ] `npm run preflight:production` passes
- [ ] `npm run uat:lifecycle` passes

## Structure intelligence
- [ ] Position hierarchy is current and reporting lines are reviewed
- [ ] Snapshot thresholds for narrow/wide span and target layers are approved planning assumptions
- [ ] Structure-cost assumptions are documented and are not presented as payroll actuals
- [ ] Current-date snapshot restriction is understood; historical reconstruction is not claimed without versioned position history
- [ ] Orphan/cycle findings are investigated before Board reporting

## Role architecture / decision rights
- [ ] Role profiles have accountable owners and approved position links
- [ ] Decision-right records reference approved role profiles before activation
- [ ] Accountable/responsible/consulted/informed roles are reviewed with business owners
- [ ] Approval authority and escalation paths match actual delegated authority

## Operating-model scenarios
- [ ] Baseline snapshot is independently approved
- [ ] Scenario assumptions are explicit and documented
- [ ] Target FTE/cost/layers/span are aggregate planning values only
- [ ] Scenario scores are not used as automatic worker-selection or employment-decision outputs
- [ ] Scenario sensitivity/financial review is completed outside automated scoring where required

## Restructuring governance
- [ ] Proposal contains aggregate position/org-unit scope only
- [ ] No named-worker ranking or selection decision is stored in the Org Design proposal
- [ ] Consultation review determination is documented
- [ ] Employee-relations review determination is documented
- [ ] Legal/labour review determination is documented where applicable
- [ ] Privacy review determination is documented
- [ ] Human review note is recorded
- [ ] Person recording review determinations does not approve the proposal
- [ ] Creator/submitting reviewer does not self-approve
- [ ] `approved_for_planning` is not treated as authority to execute individual employment action

## Organization-effectiveness governance
- [ ] KPI baseline, target, direction and tolerance are approved
- [ ] KPI review dates are assigned
- [ ] Breaches are investigated rather than automatically converted into workforce action
- [ ] Board/Executive reports are independently approved

## Privacy / AI / security
- [ ] 13 Org Design collections/indexes remain server-only
- [ ] HR Partner remains unable to `orgdesign.approve`
- [ ] Manager/employee roles do not receive enterprise Org Design access
- [ ] AI evidence remains aggregate and permission-scoped
- [ ] No AI/restructuring route gains direct consequential HR write authority
- [ ] Audit evidence is retained for create/review/approval actions

## Operations
- [ ] `/org-design` loads for an authorized HR role
- [ ] `npm run orgdesign:review` creates deduplicated review notifications
- [ ] Lifecycle Command Center shows structural/KPI/restructuring risks only to authorized roles
- [ ] Lifecycle UAT includes the Org Design route
- [ ] Rollback procedure has been rehearsed in non-production
