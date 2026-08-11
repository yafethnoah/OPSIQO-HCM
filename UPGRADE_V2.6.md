# Upgrade to v2.6 — Enterprise Privacy, Data Governance & AI Assurance

## Purpose
v2.6 adds an organization-scoped privacy and AI assurance layer above v2.5 Evidence/Audit/Assurance. It is designed to help HR/privacy teams inventory personal-data processing, document qualified-review decisions and govern AI use without converting system scores into legal conclusions.

## New workspace
Open `/privacy` after authentication with `privacy.read`.

## New permissions
- `privacy.read`
- `privacy.manage`
- `privacy.approve`
- `privacy.audit`

HR Partner receives read/manage/audit but not approval. Org Admin/HR Admin retain approval through the existing role model.

## New server-only collections
- `privacyDataAssets`, `privacyDataAssetCodeIndex`
- `privacyProcessingActivities`, `privacyProcessingCodeIndex`
- `privacyRetentionSchedules`, `privacyRetentionCodeIndex`
- `privacyAssessments`, `privacyAssessmentCodeIndex`
- `privacyRequests`
- `privacyIncidents`
- `privacyVendors`, `privacyVendorCodeIndex`
- `privacyTransfers`, `privacyTransferCodeIndex`
- `privacyAiUseCases`, `privacyAiUseCaseCodeIndex`
- `privacyAiModelRisks`, `privacyAiModelRiskCodeIndex`

All are server-authorized; Firestore Rules deny direct browser access.

## Recurring governance job
```powershell
$env:OPSIQO_JOB_ORG_ID="YOUR_ORG_ID"
npm run privacy:review
```

## Required migration review
1. Assign privacy accountability and approval roles.
2. Inventory current HR systems and personal-data categories before activating processing records.
3. Establish organization-specific privacy-request intake/identity-verification procedure and record qualified due dates.
4. Establish incident/breach escalation, legal/privacy review and regulator/individual notification procedures.
5. Review existing vendors/processors, processing locations, subprocessors and contracts/DPA terms.
6. Create transfer/privacy impact assessments before approving cross-border transfers.
7. Register every production AI use case and link high-risk/automated uses to an approved AIA/PIA/DPIA.
8. Confirm no AI use case can bypass v2.0 consequential-employment guardrails.
9. Add v2.6 collections to backup/retention/legal-hold procedures.
10. Run all dependency-aware production gates before promotion.

## Decision boundary
v2.6 does not determine which privacy statute applies, establish legal authority/lawful basis, calculate statutory response deadlines, decide whether a breach is legally reportable, determine cross-border transfer legality, or certify AI/privacy compliance. These remain qualified human decisions supported by evidence and workflow.
