# OPSIQO HCM v2.5 Upgrade — Enterprise Compliance Evidence, Audit & Assurance Center

v2.5 adds an assurance layer above v2.4 Policy & Regulatory Change, v2.3 Governance Center, HR Diagnostic, policies, audit logs and operational HCM evidence.

## Added
- Evidence Vault with internal/external governed references, classification, retention, legal hold and immutable metadata fingerprint.
- Append-only evidence ledger with chained SHA-256 entries and concurrency-safe lifecycle mutation.
- Assurance plans for internal audit, control testing, compliance assurance and external-audit readiness.
- Control tests with evidence, sampling, result, exception count and independent approval.
- Deterministic audit-sampling service with population/selection digests and reproducible seed.
- Evidence request/PBC-style workflow with independent acceptance.
- Assurance findings and CAPA with independent risk acceptance, validation and verification.
- Derived enterprise compliance calendar spanning assurance, governance, regulatory, policy and qualified-review deadlines.
- Operational assurance-readiness scoring and assurance heatmap.
- Executive/Board/Audit Committee report snapshots with independent approval.
- `assurance.read`, `assurance.manage`, `assurance.approve`, `assurance.audit`.
- `/assurance` workspace and `npm run assurance:review`.

## Deliberate boundaries
- Vault integrity verifies OPSIQO evidence metadata and the ledger chain; it does not prove substantive truth of external evidence.
- Audit/readiness scoring is an internal governance indicator only.
- OPSIQO does not issue a legal compliance conclusion, certification, legal opinion or external audit opinion.
- Human professional judgment remains required for sampling design, audit scope, findings, legal applicability and management assurance conclusions.

## New server-only collections
- `assuranceEvidence`
- `assuranceEvidenceCodeIndex`
- `assuranceEvidenceLedger`
- `assurancePlans`
- `assurancePlanCodeIndex`
- `assuranceTests`
- `assuranceEvidenceRequests`
- `assuranceSamples`
- `assuranceFindings`
- `assuranceFindingCodeIndex`
- `assuranceCapaPlans`
- `assuranceReports`

## Operations
```powershell
$env:OPSIQO_JOB_ORG_ID="YOUR_ORG_ID"
npm run assurance:review
```

The recurring review verifies evidence chains, quarantines integrity mismatches, processes evidence retention subject to legal hold, and alerts overdue tests, evidence requests, findings and CAPA.
