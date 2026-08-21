# OPSIQO ONE v7.18 — Change Manifest

## New source / domain files

- `src/domain/opsiqo-one-v7-18.ts`
- `src/lib/opsiqo-one/legacy-surface-translations-v7-18.json`
- `src/lib/opsiqo-one/legacy-surface-i18n.ts`
- `src/lib/opsiqo-one/translation-readiness.ts`
- `src/lib/opsiqo-one/execution-uat.ts`
- `src/generated/opsiqo-v7-18-translation-inventory.json`

## New application/API surfaces

- `/translation-readiness`
- `GET /api/organizations/[orgId]/opsiqo-one/translation-readiness`
- `GET /api/organizations/[orgId]/opsiqo-one/program-portfolio/export?format=csv|json`

## New UI

- `src/components/translation-readiness-workspace.tsx`
- Program Portfolio CSV export action
- Program Portfolio JSON evidence-pack export action
- AI Governance implementation/UAT gate rendering
- exact reviewed multilingual treatment on selected sign-in/setup/notifications/settings surfaces

## Updated UI/shell

- `src/app/signin/page.tsx`
- `src/app/setup/page.tsx`
- `src/components/notification-center.tsx`
- `src/components/settings-workspace.tsx`
- `src/components/program-portfolio-workspace.tsx`
- `src/components/ai-governance-center.tsx`
- `src/components/nav.tsx`
- `src/components/more-hub-workspace.tsx`

## Updated intelligence/routing

- `src/lib/opsiqo-one/command-router.ts`
- `src/lib/opsiqo-one/experience-readiness.ts`
- `src/lib/opsiqo-one/program-portfolio.ts`

## New audit/certification tooling

- `scripts/opsiqo85-translation-inventory-v7-18.mjs`
- `scripts/opsiqo85-v7-18-authenticated-accessibility-smoke.mjs`
- `scripts/opsiqo85-opsiqo-one-v7-18-audit.mjs`
- `tests/opsiqo85/opsiqo-one-v7-18.test.ts`
- `RUN_OPSIQO_ONE_V7_18_VALIDATION.ps1`
- `RUN_OPSIQO_ONE_V7_18_VALIDATION.cmd`

## New package commands

- `opsiqo85:opsiqo-one-v7.18:audit`
- `test:opsiqo-one-v7.18`
- `opsiqo85:v7.18:translation-inventory`
- `opsiqo85:v7.18:translation-inventory:verify`
- `opsiqo85:v7.18:browser-a11y-auth`

## Governance changes

- No second Safe Execute action was added.
- `SAFE_EXECUTION_ALLOWLIST` remains one action: `notifications.mark_visible_read`.
- Consequential-employment blocking remains before normal routing/execution.
- Custom Cortex agents remain below unrestricted Execute.
- AI Governance now distinguishes implementation-passed evidence from browser-UAT-required evidence before any future Execute expansion.

## Translation evidence

Frozen inventory target before final packaging:

- 184 scanned TSX files
- 3,775 heuristic candidate visible-source strings
- 88 exact reviewed source candidates matched by inventory
- 3,687 remaining candidates
- 127 explicit EN/FR/ES/AR catalogue entries
- 4 selected high-friction catalogued surfaces

## Program Portfolio export boundary

CSV/JSON exports reuse the existing permission-scoped Program Portfolio dashboard. They do not infer accounting actuals from compensation records and do not silently combine currencies. JSON preserves evidence provenance/source references.
