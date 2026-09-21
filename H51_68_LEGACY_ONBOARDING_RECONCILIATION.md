# OPSIQO H51.68 — Legacy Onboarding Reconciliation & Verification UX

Parent: H51.67 `f958d5d1fdd41ad34059336c2b505a0d9fdaf906`

## Purpose

Close the live-UAT gaps left by pre-H51.67 onboarding data without rewriting history.

## Controls

- Meaningful HR verification notes: generic values such as "completed", "done", "ok" and "verified" are rejected.
- Evidence reuse is justified separately and only when the same SHA-256 evidence is used for more than one requirement.
- Identical legacy documents are grouped by SHA-256 while each HR requirement retains an independent verification state.
- Signing-status text is classified as Legacy note, never malware-scan evidence.
- Two-step legacy repair: Preview legacy repair -> review Before/Proposed actions -> Confirm governed repair.
- Preview is server-generated and fingerprinted. Confirmation fails closed if onboarding evidence changes after preview.
- Premature Day 1/7/30/60/90 completions are reset through an audited reconciliation while preserving the previous completion metadata.
- Completed pre-start document tasks with no HR verification are flagged for governed review without rewriting the historical activation event.
- Duplicate evidence is review-only; H51.68 never automatically deletes historical documents.
- People core correction is compact, explicitly authoritative, and requires an evidence-based correction reason.
- H51.67 activation-evidence locking, shared-email semantics, and hire reservation/recovery remain intact.

## Release boundary

This package performs source certification, commit and push only.
It does NOT deploy UAT.
It does NOT touch Production.
