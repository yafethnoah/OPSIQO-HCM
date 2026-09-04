# OPSIQO H45A — PDF Safety Compatibility Repair

H45A is a narrow repair on the H45 stabilization baseline.

## Corrected classification

- Readable PDF text layer: deterministic parsing may proceed.
- Empty / genuinely scanned PDF text layer: Recruiting AI setup guidance remains available.
- Corrupt, mojibake, binary-like or otherwise unsafe extracted PDF text: fail closed with `resume_parser_unavailable`; no candidate fields are accepted.

This restores the H41 safety contract without removing the H45 Recruiting AI readiness improvements.

## Additional improvements

- User-facing unsafe-PDF message instead of a raw implementation error.
- Explicit `patchRelease: H45A` runtime identity for UAT verification.
- New regression coverage to prevent scanned and corrupt PDFs from being collapsed into the same state again.

## Validation

Run `RUN_OPSIQO_H45A_VALIDATION.ps1` on Windows. The validator preserves the H45 gates and adds the H45A PDF classification regression suite.
