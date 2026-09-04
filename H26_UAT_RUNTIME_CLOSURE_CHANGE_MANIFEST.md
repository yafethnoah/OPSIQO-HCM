# OPSIQO V7.32 H26 UAT Runtime Closure

Base: certified H25 SHA c7a97d329f721f10d14a640bacec97080c6518fa

## Confirmed UAT findings closed

- Contract Import Arabic runtime strings remained partly English.
- Contract PDF parsing surfaced a generic write/reconciliation 503 when governed AI was unavailable.
- Text-based PDF contracts had no deterministic text-layer fallback even though OPSIQO already has a governed PDF text extractor.
- Employee roster organization-unit matching was exact-only, causing normal naming aliases such as Human Resources / People & Culture to block unnecessarily.
- Ambiguous or unsafe organization mappings remain blocking; H26 does not guess across multiple valid units.
- Missing hire date, missing legal surname, unavailable positions, invalid supplied email and other authoritative-data defects remain intentionally blocking.

## Files

- src/lib/contract-import/service.ts
- src/lib/data-import/employee-import.ts
- src/lib/opsiqo-one/runtime-ui-translations-v7-32.json
- scripts/opsiqo-h26-uat-runtime-closure-audit.mjs
- tests/opsiqo85/h26-uat-runtime-closure.test.ts
- H26_UAT_RUNTIME_CLOSURE_CHANGE_MANIFEST.md
