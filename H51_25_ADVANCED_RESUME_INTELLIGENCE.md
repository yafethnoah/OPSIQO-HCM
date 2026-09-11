# OPSIQO H51.25 — Advanced Resume Intelligence

Parent release: **H51.24**
Parent SHA: `3ecc2466764709f15699c2478e62b9e7e910d383`
Branch: `h51.25/recruiting-parser-v2`

## Purpose

H51.25 fixes the public-candidate parsing failure without weakening the H51.24
fail-closed resume-assurance boundary.

## Parsing pipeline

1. Existing upload validation and SHA-256 fingerprinting.
2. Existing deterministic DOCX/TXT/RTF/Markdown extraction.
3. Native PDF.js extraction.
4. Google Document AI Enterprise OCR using the pinned stable OCR processor version.
5. Google Document AI Layout Parser using the pinned stable GA layout processor version.
6. Evidence quality scoring with trustworthy native PDF text kept authoritative; cloud OCR/layout replaces it only when native evidence is absent or materially weaker.
7. Original PDF + authoritative/recovered document evidence passed to governed Gemini.
8. Existing three-pass Recruiting ATS semantic reconstruction.
9. Existing deterministic structured-resume reconciliation.
10. Existing H51.24 resume assurance and fail-closed public candidate gate.

No candidate is hired, rejected, advanced, or ranked automatically by this change.

## AI transport

For Gemini provider profiles, H51.25 supports Vertex AI through Application Default
Credentials. The deployed release pins the Recruiting AI model to
`gemini-3.8-flash` while still requiring the existing approved/active
`RECRUITING_ATS_MODEL` and `RECRUITING_ATS` governance records.

The existing Gemini API-key transport remains in source as a controlled compatibility
fallback when `OPSIQO_RECRUITING_GEMINI_TRANSPORT=auto` or `google_api_key`.
H51.25 UAT sets the transport to `vertex`.

## Runtime configuration

`apphosting.yaml` references the following two per-project Secret Manager values:

- `OPSIQO_RECRUITING_DOCUMENT_AI_OCR_PROCESSOR`
- `OPSIQO_RECRUITING_DOCUMENT_AI_LAYOUT_PROCESSOR`

They contain processor-version resource names, not API keys. The UAT configuration
script creates/reuses the processors, pins the stable versions, stores those values,
and grants the App Hosting service account least-privilege processing roles.

## Stable parser versions

- Enterprise Document OCR: `pretrained-ocr-v2.1-2024-08-07`
- Layout Parser: `pretrained-layout-parser-v1.0-2024-06-03`

Preview/RC Layout Parser versions are deliberately not the production default.

## Release safety

- no force push
- exact H51.24 parent required
- clean working tree required
- source blob identity checked before patching
- strict H51.24 resume assurance preserved
- TypeScript, targeted tests, full Vitest, Rules, build, security scan and source manifest required
- UAT and production deployment are separate operations
- production is untouched by both the patch and UAT configuration scripts
