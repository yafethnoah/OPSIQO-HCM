# OPSIQO HCM v2.3 Upgrade — Enterprise HR Governance & Control Center

v2.3 adds a governed layer above the existing policy, HR Diagnostic, audit and AI systems. It is designed to make ownership, review cadence, attestations, exceptions and enterprise HR risk visible without turning OPSIQO into a legal-opinion or statutory-certification engine.

## New capabilities
- Enterprise governance control register with owner and accountable role.
- Source title/URL, last-reviewed date, cadence and next-review date.
- Links from governance controls to existing policies and HR Diagnostic controls.
- Independent approval for control activation/review.
- Recurring control attestations with evidence references and independent approval.
- Time-limited governance exceptions with risk level, mitigation, owner and expiry.
- Enterprise HR risk register with deterministic 5x5 risk scoring and explicit treatment.
- Independent accepted-risk and closure authority.
- Executive governance dashboard and category coverage.
- Automated source-review, attestation-overdue and exception-expiry notifications.
- Server-only Firestore collections and audit lineage.

## Route
`/governance`

## Bootstrap
Use the Governance Center bootstrap action after the Ontario diagnostic framework and organization policies exist. Bootstrap creates governed register entries from active diagnostic controls and non-archived/non-superseded policies. It is idempotent by deterministic source IDs and commits large libraries in safe chunks.

## Scheduled governance review
```powershell
$env:OPSIQO_JOB_ORG_ID="YOUR_ORG_ID"
npm run governance:review
```

## Approval model
HR Partner may read/manage governance evidence but cannot approve controls, exceptions, attestations or accepted risk. HR Admin/Org Admin approval remains subject to service-level independence checks.

## Legal boundary
A governance record, score, attestation or control status is evidence of an internal governance process. It is not legal advice, a legal conclusion or a certificate of compliance. Fact-sensitive applicability and legal conclusions remain with qualified humans.
