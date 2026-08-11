# OPSIQO HCM v2.4 Upgrade — Enterprise HR Policy & Regulatory Change Management

v2.4 adds a governed regulatory-change and policy-impact layer above v2.3 Governance Center, existing policy lifecycle, HR Diagnostic, audit and workflow services.

## Added
- Governed regulatory source register with jurisdiction, authority, HTTPS source, owner, human-review cadence and monitoring cadence.
- Secure server-side source fingerprint monitor with SSRF/private-network protections, redirect and response-size limits.
- Immutable source-snapshot metadata and candidate change signals when a source fingerprint changes.
- Regulatory change register with human triage, materiality, affected policies/controls, legal-review and implementation states.
- Regulatory obligation register with obligation-to-policy/control mapping and independent approval.
- Policy impact assessments with independently approved recommended action.
- Direct creation of a governed **draft** policy revision from an approved policy-impact assessment; existing policy approval/publish segregation remains authoritative.
- Employee policy re-attestation campaigns tied to an exact published policy version/content hash and a snapshotted worker audience.
- Qualified legal/specialist review queue with due dates, priority, claim/clear/return workflow and audit evidence.
- Executive policy/regulatory heatmap and recurring `npm run regulatory:review` automation.

## Deliberate boundary
A source fingerprint difference is only a **potential-change signal**. It is not evidence that legislation or guidance legally changed, does not determine applicability, and cannot create a compliance/non-compliance conclusion. Human review is mandatory before source snapshot acceptance, obligation approval, no-action disposition or regulated implementation closure.

## Permissions
- `regulatory.read`
- `regulatory.manage`
- `regulatory.approve`
- `regulatory.audit`

HR Partner receives read/manage/audit but not approval. HR Admin, Org Admin and Super Admin retain approval authority through the existing role model.

## New server-only collections
- `regulatorySources`
- `regulatorySourceSnapshots`
- `regulatoryChanges`
- `regulatoryObligations`
- `policyImpactAssessments`
- `policyReattestationCampaigns`
- `legalReviewQueue`

## Operations
```powershell
$env:OPSIQO_JOB_ORG_ID="YOUR_ORG_ID"
npm run regulatory:review
```

The automation checks due source monitors, refreshes active re-attestation progress and notifies overdue legal reviews. Production outbound network policy must allow only approved regulatory source destinations.
In production, set `OPSIQO_REGULATORY_SOURCE_HOSTS` to the exact comma-separated public hosts approved for monitoring. `/api/health/ready` treats an empty production allowlist as a release-blocking readiness failure.
