# OPSIQO H51.28 — Resilient Prefill Fallback

Parent release: **H51.27**

H51.28 addresses the live H51.27 public resume parse returning HTTP 503 after
approximately 34.6 seconds.

- Pass 1 remains bounded at 28 seconds.
- Text recovery is bounded at 12 seconds.
- The compact recovery evidence window is reduced to 120,000 characters.
- If both AI attempts fail and extracted source evidence scores at least 70,
  OPSIQO constructs a deterministic source-backed structured profile instead
  of immediately returning HTTP 503.
- Deterministic fallback is explicitly marked `aiVerified:false`.
- Existing `applyResumeAssurance` and `prefillReady` safeguards remain
  mandatory.
- Source authority, no-fabrication controls, record integrity, and human review
  remain preserved.
- Metadata telemetry is made Cloud Run-visible without logging resume content,
  candidate contact information, filenames, public application tokens, or
  secrets.

Production remains untouched during source certification.
