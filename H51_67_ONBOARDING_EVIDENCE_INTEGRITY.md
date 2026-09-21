# OPSIQO H51.67 — Onboarding Evidence Integrity & Activation Guardrails

Parent: H51.66 `1a4bded0bf64bd9dc350a2e63a7fffddc042e2eb`

## Scope

H51.67 closes live-UAT integrity gaps found after the H51.66 onboarding UX release.

## Controls

- Separates malware scanning from HR requirement verification.
- New document uploads remain in progress until HR explicitly verifies the requirement.
- Blocks exact duplicate document uploads by SHA-256.
- Requires an explicit evidence-reuse reason when the same verified file is intentionally used for a different requirement.
- Prevents pre-start evidence from being reopened or waived after activation.
- Adds audited post-activation reconciliation for legacy activated cases with missing pre-start evidence.
- Prevents Day 1 / 7 / 30 / 60 / 90 tasks from being completed before their phase date.
- Captures an immutable activation snapshot for future activations.
- Adds activated-case consistency warnings, duplicate-evidence warnings and classification-review warnings without treating filenames as authoritative.
- Replaces mojibake separators on the onboarding surface.
- Adds an audited People → Correct core record workflow for post-activation classification/core-data corrections.
- Strengthens hire conversion with a reservation + employee-number recovery path so a crash between worker creation and application finalization can recover the same worker instead of using shared email as identity.

## Important

A clean malware result does not mean a contract is signed or that a document satisfies an HR requirement.
A filename is a review signal only; the governing agreement and authoritative HR record control classification.

This source package does not deploy UAT or Production.
