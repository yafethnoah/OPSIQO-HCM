# OPSIQO ONE V7.27 — Change Manifest

## Added

- `src/lib/opsiqo-one/legacy-surface-translations-v7-27.json`
- `src/generated/opsiqo-v7-27-translation-inventory.json`
- `docs/OPSIQO_V7.27_TRANSLATION_INVENTORY.json`
- `scripts/opsiqo85-translation-inventory-v7-27.mjs`
- `scripts/opsiqo85-v7-27-authenticated-accessibility-smoke.mjs`
- `scripts/opsiqo85-v7-27-certification-preflight.mjs`
- `scripts/opsiqo85-v7-27-certification-summary.mjs`
- `scripts/opsiqo85-opsiqo-one-v7-27-audit.mjs`
- `tests/opsiqo85/opsiqo-one-v7-27.test.ts`
- `RUN_OPSIQO_ONE_V7_27_VALIDATION.ps1`
- `RUN_OPSIQO_ONE_V7_27_VALIDATION.cmd`
- V7.27 release metadata/docs

## Changed

- Active OPSIQO ONE product badge advances to V7.27.
- Legacy surface translation runtime advances to the V7.27 catalog.
- Translation Readiness consumes the V7.27 inventory.
- AI Copilot, People Analytics, Scenario Lab, AI Value and MFA Setup use the governed legacy-surface translation layer.
- V7.27 translation inventory filters additional obvious JSX/TypeScript fragments.
- Authenticated accessibility UAT covers the five V7.27 surfaces and reviewed Arabic markers.
- Windows preflight adds safe npm-registry-host diagnostics and encoded/OneDrive path warnings.
- Certification runner prints a sanitized first-failure summary on generic and browser-UAT failures.
- Duplicate V7.21 targeted-test execution is removed from the current certification runner.
- Historical source audits are forward-compatible with the current V7.27 badge/catalog while preserving their original substantive assertions.

## Unchanged safety boundaries

- Safe Execute remains only `notifications.mark_visible_read`.
- Consequential employment actions remain blocked before normal routing.
- No normal Cortex agent has unrestricted Execute authority.
- No production Firebase/App Hosting deployment is performed by certification.
