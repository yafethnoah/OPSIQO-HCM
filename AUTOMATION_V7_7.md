# OPSIQO HCM 8.5 V7.7 — Automation-Max Control Plane

V7.7 automates repeatable, rules-based, reversible, monitoring, reminder, orchestration and previously-approved execution work. It deliberately does **not** automate consequential employment decisions or legal/privileged approvals.

## Automated by the unified cycle

The full automation cycle runs isolated lanes so one failing processor does not prevent unrelated processors from running:

- effective-dated employee changes already approved/configured;
- secondary assignment changes already approved/configured;
- separation task readiness/overdue governance (not termination approval);
- invitation expiry, token-index cleanup and expiry reminders;
- onboarding deadline monitoring;
- scan-clean HR-library analysis, approved low-risk draft creation, and filing of approved worker-linked employee documents;
- document retention/expiry monitoring;
- policy review/re-attestation monitoring;
- leave accruals and time governance;
- performance/PIP deadlines;
- learning, certificate and skill-expiry governance;
- career/succession review monitoring;
- execution of already-approved compensation cycles;
- employee-relations and accommodation deadlines;
- safety/incident/action/inspection/RTW deadlines;
- employee-experience and service-SLA governance;
- workforce planning and people analytics jobs;
- approved AI action-plan task governance;
- HR diagnostic reassessment/remediation monitoring;
- approved inbound integration schedules and integration governance;
- identity/security/privacy/regulatory/governance/assurance monitoring;
- organizational design, resilience, strategy, platform-reliability and enterprise-command governance;
- durable domain-event workflow dispatch;
- notification-only workflow step execution;
- workflow SLA escalation;
- queued notification delivery.

## Human-governed boundaries

OPSIQO must not autonomously decide or execute:

- hire, reject, terminate, discipline, promote or demote;
- individual compensation/pay decisions;
- successor selection/confirmation;
- policy publication or legal conclusions;
- privileged-access grants, role elevation or equivalent access approvals;
- ATS candidate stage changes or automatic employment decisions.

ATS can remain decision-support assistance, with evidence and human review.

## Production scheduler

Endpoint:

```text
POST /api/internal/automation
```

Authentication:

```text
x-opsiqo-job-secret: <OPSIQO_JOB_SECRET>
```

One organization:

```json
{"scope":"organization","orgId":"<organization-id>"}
```

All organizations:

```json
{"scope":"all"}
```

Recommended cadence: every **30–60 minutes**. The application processors use due dates, leases, idempotency markers and bounded queries so repeated cycles are expected.

Use Secret Manager/App Hosting environment configuration for `OPSIQO_JOB_SECRET`; never commit it to the repository or this package.

## Local/admin execution

One organization:

```powershell
$env:OPSIQO_AUTOMATION_SCOPE='organization'
$env:OPSIQO_JOB_ORG_ID='<organization-id>'
npm run jobs:run
```

All organizations:

```powershell
$env:OPSIQO_AUTOMATION_SCOPE='all'
npm run jobs:run
```

## Evidence

Every run creates an `automationRuns` record with:

- per-lane category/status;
- start/end/duration;
- sanitized lane result details;
- isolated lane failures;
- overall completed/partial status;
- coverage summary and human-approval boundary count.

This makes automation observable rather than silently claiming success.
