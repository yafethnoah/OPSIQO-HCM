# OPSIQO ONE V7.23 Change Manifest

## New source
- `src/lib/integration/production-uat.ts` — pure connector production-UAT evidence evaluator.
- `src/app/api/organizations/[orgId]/integrations/production-uat/route.ts` — permission-scoped UAT evidence API.
- `tests/opsiqo85/integration-production-uat-v7-23.test.ts` — production-UAT behavior tests.
- `tests/opsiqo85/opsiqo-one-v7-23.test.ts` — V7.23 governance/translation regression tests.
- `src/lib/opsiqo-one/legacy-surface-translations-v7-23.json` — reviewed 23-surface EN/FR/ES/AR catalog.
- `scripts/opsiqo85-translation-inventory-v7-23.mjs` — V7.23 translation evidence inventory.
- `src/generated/opsiqo-v7-23-translation-inventory.json` and docs snapshot.
- `scripts/opsiqo85-v7-23-authenticated-accessibility-smoke.mjs` — expanded authenticated accessibility UAT.
- `scripts/opsiqo85-opsiqo-one-v7-23-audit.mjs` — V7.23 architecture/governance audit.
- V7.23 Windows validation runner and release documentation.

## Modified source
- `src/components/integration-command-center.tsx` — production connector UAT evidence display/export.
- `src/components/security-operations-center.tsx` — reviewed multilingual hook.
- `src/components/privacy-governance-center.tsx` — reviewed multilingual hook.
- `src/components/assurance-center.tsx` — reviewed multilingual hook.
- `src/components/platform-reliability-center.tsx` — reviewed multilingual hook.
- `src/lib/opsiqo-one/legacy-surface-i18n.ts` — V7.23 catalog authority.
- `src/lib/opsiqo-one/translation-readiness.ts` and `experience-readiness.ts` — V7.23 evidence reporting.
- `src/components/nav.tsx` — V7.23 product identity.
- `package.json` — V7.23 audit/test/translation/browser commands.
- V7.18–V7.22 source audits — forward-compatible lineage assertions only; underlying historical checks remain unchanged.
