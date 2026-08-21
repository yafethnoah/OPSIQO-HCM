# OPSIQO ONE V7.25 Change Manifest

## New files

- `firebase.test.json` — isolated local Firebase emulator config required by authenticated certification UAT.
- `src/lib/opsiqo-one/legacy-surface-translations-v7-25.json`
- `src/generated/opsiqo-v7-25-translation-inventory.json`
- `docs/OPSIQO_V7.25_TRANSLATION_INVENTORY.json`
- `scripts/opsiqo85-translation-inventory-v7-25.mjs`
- `scripts/opsiqo85-v7-25-authenticated-accessibility-smoke.mjs`
- `scripts/opsiqo85-v7-25-certification-preflight.mjs`
- `scripts/opsiqo85-opsiqo-one-v7-25-audit.mjs`
- `tests/opsiqo85/opsiqo-one-v7-25.test.ts`
- `RUN_OPSIQO_ONE_V7_25_VALIDATION.ps1`
- `RUN_OPSIQO_ONE_V7_25_VALIDATION.cmd`
- `OPSIQO_ONE_V7_25.md`
- `START_HERE_OPSIQO_ONE_V7_25.md`
- `VALIDATION_REPORT_OPSIQO_ONE_V7_25.md`
- `RELEASE_METADATA_V7_25.json`

## Modified files

- `src/components/regulatory-change-center.tsx` — governed EN/FR/ES/AR legacy-surface localization.
- `src/components/resilience-center.tsx` — governed EN/FR/ES/AR legacy-surface localization.
- `src/components/identity-command-center.tsx` — governed EN/FR/ES/AR legacy-surface localization.
- `src/components/governance-control-center.tsx` — governed EN/FR/ES/AR legacy-surface localization.
- `src/components/enterprise-command-center.tsx` — governed EN/FR/ES/AR legacy-surface localization.
- `src/lib/opsiqo-one/legacy-surface-i18n.ts` — consumes the V7.25 reviewed catalog.
- `src/lib/opsiqo-one/translation-readiness.ts` — consumes the V7.25 generated inventory and V7.25 truth boundary.
- `src/components/nav.tsx` — product badge V7.25.
- `package.json` — V7.25 audit, translation, preflight, browser-UAT and targeted-test commands.
- `START_HERE.md` — current-release pointer updated from the stale V7.9.3 recovery text to V7.25.
- `NEXT_PHASE.md` — advances the controlled closure plan to V7.26.
- historical V7.18–V7.24 audit scripts — forward-compatible current-version assertions only; original domain/safety assertions preserved.

## Certification fixes

- repaired missing `firebase.test.json` reference from the Windows certification path
- added local-only emulator project/config validation
- added runner-to-package-script contract validation
- added no-production-deploy static runner validation
- added package-lock root consistency validation
- added Windows extraction-path warning
- added sanitized gate ledger for Windows certification evidence

## Safety invariants preserved

- consequential-action firewall executes before normal Ask OPSIQO routing
- custom agents are not promoted to unrestricted Execute
- Safe Execute remains exactly `notifications.mark_visible_read`
- certification runner pins emulator project to `demo-opsiqo-local`
- no production deployment from certification runner
- no intentional secret-value printing or secret-value ledger capture
