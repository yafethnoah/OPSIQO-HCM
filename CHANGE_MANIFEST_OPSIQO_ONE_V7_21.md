# OPSIQO ONE V7.21 — Change Manifest

## Added

- `src/lib/opsiqo-one/legacy-surface-translations-v7-21.json`
- `scripts/opsiqo85-translation-inventory-v7-21.mjs`
- `scripts/opsiqo85-v7-21-authenticated-accessibility-smoke.mjs`
- `scripts/opsiqo85-opsiqo-one-v7-21-audit.mjs`
- `tests/opsiqo85/opsiqo-one-v7-21.test.ts`
- `RUN_OPSIQO_ONE_V7_21_VALIDATION.ps1`
- `RUN_OPSIQO_ONE_V7_21_VALIDATION.cmd`
- `OPSIQO_ONE_V7_21.md`
- `START_HERE_OPSIQO_ONE_V7_21.md`
- `VALIDATION_REPORT_OPSIQO_ONE_V7_21.md`
- `docs/OPSIQO_V7_21_TRANSLATION_INVENTORY.json`
- `src/generated/opsiqo-v7-21-translation-inventory.json`

## Modified

- Compliance/Documents workspace: shared reviewed translation hook.
- Policy Intelligence workspace: shared reviewed translation hook.
- Compliance Radar workspace: shared reviewed translation hook.
- Employee Experience workspace: shared reviewed translation hook.
- Employee Service Center workspace: shared reviewed translation hook.
- Workflow panel: shared reviewed translation hook.
- Legacy translation runtime: V7.21 catalog.
- Translation Readiness / Experience Readiness: V7.21 evidence and truth boundaries.
- Knowledge Graph domain/service: explicit policy, knowledge, workflow, learning and compliance node/edge types with domain permissions.
- Scenario Lab domain/service/UI: expanded Digital Twin connected-knowledge counts.
- Intelligence Hub: expanded Knowledge Graph metrics.
- Organizational Memory domain/service/UI: published learning-course metadata as a citation-bearing source.
- Navigation badge: V7.21.
- Package scripts: V7.21 audit/test/inventory/browser commands.
- V7.18–V7.20 historical source audits: forward-version compatibility only; no safety requirement removed.

## Unchanged safety boundaries

- Consequential employment action firewall remains first.
- Custom-agent authority ceiling remains below unrestricted Execute.
- Safe Execute allowlist contains one action only.
- MFA fail-closed behavior remains intact.
- Tenant isolation remains intact.
- HR-domain permissions remain independent from AI administration permissions.
- General Knowledge Graph/Organizational Memory exclude employee-document contents, compensation, health, case data and private contacts.
