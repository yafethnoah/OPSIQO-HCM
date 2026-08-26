# OPSIQO V7.32 H30 — Employee Import Review & Completion

## Purpose

H30 improves employee import so parsed workforce records can be completed,
corrected and revalidated directly inside OPSIQO without requiring HR users
to edit and re-upload the original CSV, XLSX or PDF source.

## Baseline

H29 frozen source:

26ab9374ca0f1013ba93eb28bfa131efb73cdd76

## Functional changes

- Parsed employee rows remain visible in a governed review preview.
- Missing or invalid employee information can be corrected directly.
- First name, last name, email, employee number, phone, employment type and
  hire date can be reviewed and corrected.
- Organization unit is selected from authoritative organizational master data.
- Position selection is constrained by organization unit and available capacity.
- Manager selection uses authoritative worker records.
- Corrected rows are revalidated server-side.
- Ready / Needs Review counts update after correction.
- Import commit remains blocked until every row passes authoritative validation.
- Reviewer corrections are persisted in the server-issued preview.
- Correction activity generates an audit record.

## Governance preserved

H30 preserves earlier governed reconciliation behavior:

- Unique governed organization-unit aliases may resolve automatically.
- Governed alias mapping remains visible to the reviewer.
- Ambiguous organization-unit matches remain explicit and non-silent.
- Ambiguous position matches remain explicit.
- Duplicate employee numbers remain blocked.
- Duplicate work emails remain blocked.
- Position capacity remains authoritative.
- Invalid managers remain blocked.
- Same-import manager cycles remain blocked.
- Employee creation remains server-authoritative.

## Validation evidence

H30 passed:

- H30 employee import review-completion contract.
- Existing PDF employee-import regression suite.
- Existing universal-import regression suite.
- H26 UAT runtime/governance regression.
- TypeScript.
- Full Vitest regression suite.
- Production build.
- Git diff integrity.

## Deployment boundary

No production deployment is part of the H30 source freeze.

H30 must be proven through canonical Git export before UAT rollout.