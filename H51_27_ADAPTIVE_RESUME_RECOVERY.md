# OPSIQO H51.27 — Adaptive Resume Recovery

Parent release: **H51.26**

## Why H51.27 exists

Live UAT proved that H51.26 successfully bounded the previously indefinite resume parse, but the latest public parse returned HTTP 503 after about 20 seconds. The predecessor H51.25 requests returned HTTP 422 after roughly 96–106 seconds. H51.27 therefore fixes both failure modes without weakening the public-candidate assurance gate.

## Changes

- Strong extracted evidence (native PDF.js or Document AI evidence) is used text-first for Gemini pass 1 when evidence quality is at least 70.
- The original PDF remains available for pass 2 visual verification.
- Pass 1 budget is 20 seconds.
- If pass 1 fails and trusted evidence text exists, OPSIQO runs one compact text-only recovery pass instead of returning an immediate provider-timeout 503.
- If the reconstructed object is still missing critical identity, employment, education, or basic skills structure, OPSIQO runs one final bounded text-only completeness recovery.
- Recovery output is merged conservatively; non-empty structured arrays are preferred without fabricating fields.
- Metadata-only resume-stage telemetry is emitted to Cloud Logging. No resume content, filename, email, phone, application token, or secret value is logged by the new telemetry helper.
- H51.24/H51.25/H51.26 fail-closed assurance, native evidence authority, no-fabrication rules, and human review remain preserved.

## Runtime budgets

- Document AI: 18s
- Pass 1: 20s
- Pass 2: 12s
- Pass 3: 8s
- Recovery: 10s
- Provider attempts per stage: at most 2 inside each stage deadline

Production is untouched by source certification.
