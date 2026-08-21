# OPSIQO ONE V7.29 — Change Manifest

## Added
- `legacy-surface-translations-v7-29.json`
- conflict-safe global reviewed translation pool and runtime reuse
- `opsiqo85-translation-inventory-v7-29.mjs`
- V7.29 certification preflight, summary, authenticated browser UAT and deployment readiness scripts
- `opsiqo85-v7-29-final-release-attestation.mjs`
- `PRODUCTION_SIGNOFF_TEMPLATE_V7_29.json`
- V7.29 PowerShell/CMD validation runner
- V7.29 audit and targeted test
- release metadata and final release documentation

## Changed
- AppShell activates global exact reviewed translation reuse.
- Catalogued surface translation takes precedence over global reuse.
- Ambiguous exact-source translations are never globally reused.
- Product badge advances to V7.29.
- Translation readiness consumes the V7.29 inventory snapshot.

## Preserved
- tenant isolation
- MFA fail-closed behavior
- consequential employment firewall
- custom agent Prepare ceiling
- one-action Safe Execute allowlist
- marketplace workflow disabled-by-default rule
- no production deployment in certification runners
