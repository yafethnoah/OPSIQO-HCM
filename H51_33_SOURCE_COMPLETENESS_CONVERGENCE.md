# OPSIQO H51.33 — Source Completeness & Readiness Convergence

Parent release: H51.32
Parent SHA: `bd1c82a4d2d2c49a372eb68bcbe9582b9f391217`

## Release invariant

If the source contains a structured fact OPSIQO can detect, exactly one of these
must be true:

1. the fact is populated in the correct structured field; or
2. a critical review issue explicitly identifies the missing/inconsistent fact.

A source-supported fact may never silently disappear while structural readiness
is shown as passed.

## H51.33 improvements

- section-bounded education completion evidence searches a wider local record
  window and handles heavily wrapped PDF lines;
- expected graduation/completion is populated as `graduationDate`;
- explicit in-progress/expected education is normalized to `completed=false`;
- readiness blocks missing or mismatched source-supported expected completion;
- strong certification/licence evidence can be recovered even when the heading
  is non-standard;
- source certification evidence with no structured certification record blocks
  readiness rather than silently disappearing;
- V14 transactional repair scores missing expected education and certification
  completeness;
- candidate success wording now means semantic **and source-completeness**
  readiness passed.

## Preserved safeguards

- semantic entity purity;
- volunteer semantic dedupe;
- explicit local Current evidence;
- transactional repair rollback;
- pre-merge candidate integrity gate;
- final `candidateVerificationGate`;
- original uploaded resume as Fit % evidence authority;
- no automatic hire/reject/advance action;
- production untouched during certification.
