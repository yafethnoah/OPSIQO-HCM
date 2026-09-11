# OPSIQO H51.26 — Bounded Resume Parsing Latency

Parent release: **H51.25**
Parent SHA: `4257be30542084bfccafa9b5c14af33183672a34`
Branch: `h51.26/recruiting-bounded-latency`

## Purpose

H51.26 fixes the live UAT condition where resume parsing can remain on
"AI parsing, reconstructing & verifying…" without completing in a reasonable bounded
window. It does **not** weaken H51.24/H51.25 evidence validation, structured record
integrity, candidate/recruiter separation, native PDF authority, or the public-candidate
`prefillReady` fail-closed gate.

## Runtime budgets

- Document AI OCR/Layout recovery: 18 seconds total per parallel processor call.
- Gemini pass 1 — PDF + evidence extraction: 16 seconds.
- Gemini pass 2 — PDF verification: 12 seconds.
- Gemini pass 3 — text-only semantic reconstruction: 8 seconds.
- Provider retries: maximum 2 attempts inside the same stage deadline.

Document AI OCR and Layout Parser continue in parallel, so their configured deadline is
not additive. The expected worst-case external-service budget is approximately 54 seconds,
plus small deterministic/local processing overhead.

## Reliability behavior

- Every AI HTTP request has an AbortController-backed deadline.
- Retry delays cannot extend a stage beyond its deadline.
- A provider timeout returns a controlled retryable fail-closed error.
- Vertex timeout is not followed by an API-key fallback that could double the timeout.
- Pass 3 no longer uploads the PDF again; it receives only the verified pass and source
  evidence text.
- Pass 2 or pass 3 failure continues to fall back to the last successfully verified
  result, preserving the existing H51.25 defensive behavior.
- Pass 1 still must succeed for governed AI enhancement; otherwise the workflow remains
  fail-closed.

## Preserved safeguards

- no fabrication
- source evidence remains authoritative
- high-quality native PDF text remains authoritative
- Document AI remains recovery/augmentation only in automatic mode
- structured employment/education relationships remain enforced
- candidate/recruiter identity separation remains enforced
- protected/sensitive traits remain excluded
- no automated hire/reject/advance decision
- H51.24 `applyResumeAssurance` remains active
- public candidate `prefillReady` remains mandatory

Production is untouched by the H51.26 source-freeze operation.
