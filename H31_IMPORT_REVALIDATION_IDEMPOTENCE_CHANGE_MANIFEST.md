# OPSIQO V7.32 H31 — Import Revalidation Idempotence

## UAT finding

H30 successfully introduced direct employee-row completion and server-side
revalidation. Live UAT acceptance identified that validation messages could
multiply after repeated Save & revalidate operations.

Example symptom:

- one missing hire-date finding became repeated multiple times;
- one organization-unit finding became repeated multiple times;
- the row-level "items still need review" count therefore became misleading.

## Root cause

H30 `validateRows()` copied the prior preview row's complete `errors` and
`warnings` arrays and then appended the newly computed validation findings.
Each correction pass therefore accumulated the previous pass.

## H31 repair

- Ordinary validation findings are recomputed from current corrected values.
- Previous ordinary errors are not carried into the next validation pass.
- Only unresolved governed reconciliation evidence is retained when necessary.
- Governed alias mapping evidence remains visible until the organization unit is
  manually reviewed.
- Ambiguous organization-unit / position reconciliation remains non-silent.
- Error and warning arrays are de-duplicated before preview persistence.
- H30 server-authoritative PATCH/revalidation/audit behavior is unchanged.

## Expected UX

Repeated Save & revalidate operations are idempotent:

- unchanged invalid row -> same unique findings, not multiplied findings;
- corrected field -> stale finding disappears;
- fully valid row -> transitions to Ready.

## Deployment

H31 is a UAT-discovered hotfix. Production remains untouched until H31 passes
full regression, canonical release proof and live UAT acceptance.