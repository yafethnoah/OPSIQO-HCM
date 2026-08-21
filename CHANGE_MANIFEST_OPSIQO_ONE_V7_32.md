# OPSIQO ONE V7.32 — Change Manifest

## Hotfix 11 — Document Scan and UAT Hardening

- Production employee-document `clean` status now requires a bounded scan-evidence reference.
- Prehire documents gain governed clean/quarantine actions with audit provenance.
- Required blocking prehire document tasks use the latest uploaded evidence for activation.
- Production prehire download and evidence promotion fail closed for unscanned/quarantined evidence.
- Quarantining a prehire document reopens its onboarding task.
- Production-readiness checks now validate canonical credential-free HTTPS origins, base-URL alignment, Firebase Admin credential structure, and non-trivial governed secrets.
- Vitest configuration is moved to `vitest.config.mts` to remove the CommonJS/ESM forward-compatibility warning rather than suppress it.
- Authenticated browser UAT now prints route progress, validates HTTP status, records route duration, and writes partial evidence on runtime failure.
- Added Hotfix 11 structural and targeted regression gates to the canonical V7.32 Windows runner.
- Static localization remains closed at **0 backlog / 3,528 reviewed candidates**.

## New / versioned files

- `src/lib/opsiqo-one/legacy-surface-translations-v7-32.json`
- `src/lib/opsiqo-one/v7-32-runtime-closure.ts`
- `docs/OPSIQO_V7_32_NON_TRANSLATABLE_IDENTIFIERS.json`
- `docs/OPSIQO_V7.32_TRANSLATION_INVENTORY.json`
- `src/generated/opsiqo-v7-32-translation-inventory.json`
- `scripts/opsiqo85-translation-inventory-v7-32.mjs`
- `scripts/opsiqo85-v7-32-authenticated-accessibility-smoke.mjs`
- `scripts/opsiqo85-v7-32-certification-preflight.mjs`
- `scripts/opsiqo85-v7-32-certification-summary.mjs`
- `scripts/opsiqo85-v7-32-human-signoff-core.mjs`
- `scripts/opsiqo85-v7-32-human-signoff-validate.mjs`
- `scripts/opsiqo85-v7-32-deployment-readiness-summary.mjs`
- `scripts/opsiqo85-v7-32-final-release-attestation.mjs`
- `scripts/opsiqo85-opsiqo-one-v7-32-audit.mjs`
- `tests/opsiqo85/opsiqo-one-v7-32.test.ts`
- `RUN_OPSIQO_ONE_V7_32_VALIDATION.ps1`
- `RUN_OPSIQO_ONE_V7_32_VALIDATION.cmd`
- `PRODUCTION_SIGNOFF_TEMPLATE_V7_32.json`
- `RELEASE_METADATA_V7_32.json`

## Modified active surfaces

- `src/lib/opsiqo-one/legacy-surface-i18n.ts` now loads the V7.32 catalog.
- `src/lib/opsiqo-one/translation-readiness.ts` now reports the V7.32 snapshot and zero-static-backlog boundary.
- `src/components/nav.tsx` displays V7.32.
- `package.json` exposes V7.32 audit, translation, browser, certification, sign-off and test commands.
- Historical source audits are changed only where needed to recognize V7.32 as the current release; their substantive controls remain intact.
