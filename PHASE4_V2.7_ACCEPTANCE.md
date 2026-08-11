# Phase 4 v2.7 Production Acceptance — Workforce Resilience, Continuity & Crisis Management

## Dependency/build gate
- [ ] trusted `package-lock.json` generated and committed
- [ ] `npm ci`, `npm run typecheck`, `npm test`, `npm run test:rules`, `npm run build` pass

## Critical-role governance
- [ ] Critical roles have approved owners, business-process links, minimum coverage, successor coverage and review dates
- [ ] Role coverage does not rank or auto-select individual employees
- [ ] Single points of failure and insufficient coverage are visibly flagged
- [ ] Critical-role approval is independently authorized

## Workforce BIA / continuity
- [ ] RTO does not exceed maximum tolerable downtime
- [ ] Minimum workforce staffing and assumptions are documented
- [ ] Continuity plans have activation criteria, command roles, alternate-work arrangements, communications and recovery objectives
- [ ] Plan approval is independent; activation remains human-owned

## Crisis / recovery
- [ ] Incident command, severity, affected units, staffing gaps and communications are auditable
- [ ] Crisis closure is independently authorized after resolution
- [ ] Recovery plans cannot complete with open milestones
- [ ] Recovery closure requires independent verification

## Exercises / reporting
- [ ] Exercises record target and actual recovery time, gaps, lessons and actions
- [ ] Exercise review is independent from creator/completer
- [ ] Resilience reports are point-in-time snapshots with independent approval
- [ ] Resilience score is clearly labelled operational only

## Security / operations
- [ ] all v2.7 resilience collections and code indexes reject direct browser reads/writes
- [ ] HR Partner does not receive `resilience.approve`
- [ ] managers can report/read incidents but cannot approve governed resilience records
- [ ] `npm run resilience:review` produces deduplicated coverage/review/exercise/recovery notifications
- [ ] Lifecycle UAT includes `/resilience`
