# OPSIQO ONE v7.15 Change Manifest

## New domain
- `src/domain/opsiqo-one-v7-15.ts`

## New governed services
- `src/lib/opsiqo-one/unified-workforce.ts`
- `src/lib/opsiqo-one/grant-workforce.ts`
- `src/lib/opsiqo-one/meeting-actions.ts`
- `src/lib/opsiqo-one/notification-intelligence.ts`

## New API surfaces
- `src/app/api/organizations/[orgId]/opsiqo-one/unified-workforce/route.ts`
- `src/app/api/organizations/[orgId]/opsiqo-one/grant-workforce/route.ts`
- `src/app/api/organizations/[orgId]/opsiqo-one/grant-workforce/source/route.ts`
- `src/app/api/organizations/[orgId]/opsiqo-one/grant-workforce/allocation/route.ts`
- `src/app/api/organizations/[orgId]/opsiqo-one/meeting-actions/route.ts`
- `src/app/api/organizations/[orgId]/opsiqo-one/meeting-actions/[draftId]/route.ts`

## New workspaces
- `src/components/unified-workforce-workspace.tsx`
- `src/components/grant-workforce-workspace.tsx`
- `src/components/employee-service-center-workspace.tsx`
- `src/components/meeting-actions-workspace.tsx`
- `src/app/workforce-registry/page.tsx`
- `src/app/grant-workforce/page.tsx`
- `src/app/employee-service-center/page.tsx`
- `src/app/meeting-actions/page.tsx`

## Extended existing OPSIQO ONE services/UI
- `src/domain/opsiqo-one-v7-14.ts` — Daily Brief 2.0 digest/proactive signal contract.
- `src/domain/notifications.ts` — optional category/priority metadata for consolidation.
- `src/lib/opsiqo-one/daily-brief.ts` — notification grouping + permission-scoped grant-expiry signals.
- `src/components/daily-brief-workspace.tsx` — proactive intelligence + digest UI.
- `src/lib/opsiqo-one/cortex.ts` — Grant Workforce and Unified Workforce agents.
- `src/lib/opsiqo-one/command-router.ts` — new outcome routing while preserving consequential-action precedence.
- `src/components/nav.tsx` — V7.15 specialist destinations, five-outcome model preserved.
- `src/components/more-hub-workspace.tsx` — connected workforce/service destinations.
- `scripts/opsiqo85-opsiqo-one-v7-14-audit.mjs` — forward-compatible product identity assertion.
- `package.json` — V7.15 audit/test scripts.

## New certification assets
- `scripts/opsiqo85-opsiqo-one-v7-15-audit.mjs`
- `tests/opsiqo85/opsiqo-one-v7-15.test.ts`
- `RUN_OPSIQO_ONE_V7_15_VALIDATION.ps1`
- `RUN_OPSIQO_ONE_V7_15_VALIDATION.cmd`
- `OPSIQO_ONE_V7_15.md`
- `CHANGE_MANIFEST_OPSIQO_ONE_V7_15.md`
- `START_HERE_OPSIQO_ONE_V7_15.md`
- `VALIDATION_REPORT_OPSIQO_ONE_V7_15.md`
