# OPSIQO H51.29 — Candidate Review Recovery

Parent release: **H51.28**

## Live evidence

H51.28 eliminated the provider-layer HTTP 503 and reached the strict structured
resume assurance layer. The public application now fails with
`resume_parse_insufficient` because the public parse endpoint still invokes
`parseResumeFile` in strict prefill mode.

## Architectural correction

The public parse endpoint now invokes:

`parseResumeFile(..., { requireStructuredPrefill: false })`

This does **not** lower or remove the quality gate.

Instead:

1. Source-backed machine output may populate an editable **review draft**.
2. The UI surfaces unresolved fields and structured issues for correction.
3. The candidate must review every parsed resume section and explicitly confirm
   that inaccurate or missing information was corrected.
4. Final submission reparses the original resume, merges the candidate-reviewed
   structured resume, and runs `candidateVerificationGate`.
5. Any remaining critical structured issue still returns
   `resume_structural_review_required` and blocks final submission.
6. Internal Fit % remains grounded in the original uploaded resume evidence;
   candidate edits do not rewrite the evidence source.

## Preserved safeguards

- H51.28 V10 source-backed fallback
- strict `prefillReady` machine assurance for strict callers
- source evidence authority
- no fabrication
- protected/sensitive-trait boundary
- candidate verification
- final critical-structure fail-closed gate
- no automatic hire/reject/advance
- production untouched
