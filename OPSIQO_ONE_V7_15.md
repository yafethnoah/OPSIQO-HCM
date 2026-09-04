# OPSIQO ONE v7.15 — Connected Workforce Operations

OPSIQO ONE v7.15 extends the AI-native HCM foundation into connected workforce operations without creating parallel HR systems or weakening the existing human-decision boundary.

## Delivered capabilities

### Unified Human + Digital Workforce
- Permission-scoped workforce registry under `workforce.read`.
- Employees, temporary workers, contractors, interns and volunteers remain authoritative HRIS identities.
- Approved custom Cortex agents appear as separate digital-workforce identities only to users with appropriate AI audit/management visibility.
- Digital agents are never converted into employees and do not inherit HR authority.

### Grant / Nonprofit Workforce Intelligence
- Explicit funding-source records with funder, period, currency, optional budget and lifecycle state.
- Explicit worker-to-funding allocations.
- Server-side validation prevents overlapping allocations above 100%.
- Allocation dates must remain inside the funding-source period.
- Closed sources and terminated workers cannot receive new allocations.
- Funding-expiry signals feed Daily Brief 2.0.
- No donor-compliance, employment-law, salary-continuation or automatic reduction conclusions are inferred.

### Employee Service Center
- Outcome-focused employee help surface reusing the existing Experience dashboard, HR knowledge and governed service-ticket/SLA engine.
- No parallel case/ticket architecture was introduced.

### Meeting → Action
- Creator-private meeting-action drafts.
- Review/archive lifecycle only in this phase.
- Audit trail records metadata/counts while redacting meeting content.
- No automatic personnel, performance, disciplinary, health or goal writes.

### Daily Brief 2.0 + Notification Intelligence
- Unread notifications are consolidated by category to reduce alert noise.
- Priority digest samples are bounded.
- Funding-expiry evidence can create a proactive workforce-planning signal for authorized users.
- No hidden employee risk score or individual departure-risk inference.

## Governance boundaries

1. Consequential employment actions remain blocked in Ask OPSIQO before normal routing.
2. Unified Workforce requires `workforce.read`; general directory access is not enough.
3. Grant writes require `workforce.manage`.
4. Meeting drafts remain private to their creator by default.
5. Digital-agent visibility does not imply authority to use those agents against HR domains.
6. New V7.15 collections are accessed through server-side governed services rather than direct browser Firestore writes.
7. Existing MFA, tenant isolation, audit, human approval, Cortex action ceilings and Agent Builder independent approval remain unchanged.

## Product identity

`OPSIQO ONE v7.15 · HCM v8.5`
