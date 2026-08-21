# OPSIQO ONE v7.17 Change Manifest

## New files

- `src/domain/opsiqo-one-v7-17.ts`
- `src/lib/opsiqo-one/program-portfolio.ts`
- `src/lib/opsiqo-one/execution-readiness.ts`
- `src/components/program-portfolio-workspace.tsx`
- `src/app/program-portfolio/page.tsx`
- `src/app/api/organizations/[orgId]/opsiqo-one/program-portfolio/route.ts`
- `src/app/api/organizations/[orgId]/opsiqo-one/program-portfolio/evidence/route.ts`
- `scripts/opsiqo85-v7-17-browser-accessibility-smoke.mjs`
- `scripts/opsiqo85-translation-inventory-v7-17.mjs`
- `scripts/opsiqo85-opsiqo-one-v7-17-audit.mjs`
- `tests/opsiqo85/opsiqo-one-v7-17.test.ts`
- `OPSIQO_ONE_V7_17.md`
- `START_HERE_OPSIQO_ONE_V7_17.md`
- `CHANGE_MANIFEST_OPSIQO_ONE_V7_17.md`
- `VALIDATION_REPORT_OPSIQO_ONE_V7_17.md`
- `RELEASE_METADATA_V7_17.json`
- `RUN_OPSIQO_ONE_V7_17_VALIDATION.ps1`
- `RUN_OPSIQO_ONE_V7_17_VALIDATION.cmd`

## Program Portfolio modifications

- `src/components/nav.tsx` — Program Portfolio destination and v7.17 identity.
- `src/components/more-hub-workspace.tsx` — Program Portfolio remains behind the existing outcome model.
- `src/lib/opsiqo-one/command-router.ts` — permission-scoped Program Portfolio routing.
- `src/lib/opsiqo-one/cortex.ts` — Grant Workforce Agent understands portfolio evidence without gaining Execute authority.
- `src/lib/opsiqo-one/daily-brief.ts` — bounded portfolio variance signal for authorized workforce readers.

## Meeting → Workflow modifications

- `src/lib/opsiqo-one/meeting-actions.ts` — three governed templates: action register, sequenced follow-up and review gate.
- `src/domain/opsiqo-one-v7-16.ts` — promotion result can identify the selected template.
- `src/components/meeting-actions-workspace.tsx` — multilingual template selection and safety explanation.

Every template still requires creator ownership, reviewed status and `workflow.manage`; every promoted workflow remains manual and disabled until separate activation.

## Safe Execute governance

- `src/lib/opsiqo-one/execution-readiness.ts` — explicit enabled/candidate/prohibited catalogue.
- `src/components/ai-governance-center.tsx` — displays Execute readiness evidence.

V7.17 does **not** expand the actual Execute allowlist. The v7.16 notification action remains the only enabled safe action.

## Accessibility and translation evidence

- `scripts/opsiqo85-v7-17-browser-accessibility-smoke.mjs` — real browser/CDP smoke for public auth routes.
- `scripts/opsiqo85-translation-inventory-v7-17.mjs` — source inventory of candidate visible legacy English strings.
- `src/lib/opsiqo-one/experience-readiness.ts` — records browser-evidence hooks while preserving manual WCAG and legacy-translation review gates.
- `package.json` — V7.17 audit, targeted test, browser accessibility and translation inventory commands.

## Explicit non-changes

- No production Firebase/App Hosting deployment.
- No production Firestore data modification.
- No secret values embedded in the release.
- No new Safe Self-Service Execute action beyond v7.16 notification read.
- No normal Cortex agent receives unrestricted Execute authority.
- No financial value is inferred from Compensation records.
- No automatic legal, accounting, donor-compliance or WCAG-conformance conclusion is introduced.
