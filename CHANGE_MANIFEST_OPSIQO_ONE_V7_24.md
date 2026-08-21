# OPSIQO ONE V7.24 Change Manifest

## New files

- `src/lib/opsiqo-one/legacy-surface-translations-v7-24.json`
- `src/generated/opsiqo-v7-24-translation-inventory.json`
- `docs/OPSIQO_V7.24_TRANSLATION_INVENTORY.json`
- `scripts/opsiqo85-translation-inventory-v7-24.mjs`
- `scripts/opsiqo85-v7-24-authenticated-accessibility-smoke.mjs`
- `scripts/opsiqo85-v7-24-certification-preflight.mjs`
- `scripts/opsiqo85-opsiqo-one-v7-24-audit.mjs`
- `tests/opsiqo85/opsiqo-one-v7-24.test.ts`
- `RUN_OPSIQO_ONE_V7_24_VALIDATION.ps1`
- `RUN_OPSIQO_ONE_V7_24_VALIDATION.cmd`
- `OPSIQO_ONE_V7_24.md`
- `START_HERE_OPSIQO_ONE_V7_24.md`
- `VALIDATION_REPORT_OPSIQO_ONE_V7_24.md`

## Modified files

- `src/components/safety-workspace.tsx` — governed legacy-surface localization and full safety disclaimer translation boundary.
- `src/components/career-workspace.tsx` — governed legacy-surface localization.
- `src/components/hr-diagnostic-workspace.tsx` — governed legacy-surface localization.
- `src/lib/opsiqo-one/legacy-surface-i18n.ts` — consumes V7.24 reviewed catalog.
- `src/components/nav.tsx` — product badge V7.24.
- `package.json` — V7.24 audit, translation, preflight, browser-UAT and targeted-test commands.
- historical V7.18–V7.23 audit scripts — forward-compatible current-version assertions only; original domain/safety checks preserved.

## Safety invariants preserved

- consequential-action firewall executes before normal Ask OPSIQO routing
- custom agents are not promoted to unrestricted Execute
- Safe Execute remains exactly `notifications.mark_visible_read`
- no production deployment from certification runner
- no intentional secret-value printing
