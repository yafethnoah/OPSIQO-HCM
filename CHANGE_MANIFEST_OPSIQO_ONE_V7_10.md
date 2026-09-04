# Change Manifest — OPSIQO ONE v7.10

## Source baseline

- Uploaded source: `OPSIQO_HCM_8.5_V7.9.3.3_UAT_MFA_HOTFIX_FIXED_2026-08-17(1).zip`
- Product identity retained: OPSIQO HCM 8.5
- Production-evidence semantic baseline retained: `3.6.1`
- New experience layer: OPSIQO ONE `v7.10`

## New source files

- `src/domain/opsiqo-one.ts`
- `src/lib/opsiqo-one/cortex.ts`
- `src/lib/opsiqo-one/command-router.ts`
- `src/lib/opsiqo-one/knowledge-graph.ts`
- `src/lib/opsiqo-one/overview.ts`
- `src/app/api/organizations/[orgId]/opsiqo-one/command/route.ts`
- `src/app/api/organizations/[orgId]/opsiqo-one/overview/route.ts`
- `src/components/opsiqo-command-bar.tsx`
- `src/components/my-work-workspace.tsx`
- `src/components/intelligence-hub-workspace.tsx`
- `src/components/more-hub-workspace.tsx`
- `src/app/my-work/page.tsx`
- `src/app/intelligence/page.tsx`
- `src/app/more/page.tsx`
- `tests/opsiqo85/opsiqo-one-v7-10.test.ts`
- `scripts/opsiqo85-opsiqo-one-v7-10-audit.mjs`

## Modified source files

- `src/components/app-shell.tsx` — persistent authenticated Ask OPSIQO surface.
- `src/components/nav.tsx` — five primary outcome destinations while preserving specialist, permission-aware navigation and HCM v8.5 identity.
- `src/components/superapp-workspace.tsx` — My Day terminology, top-five attention limit and My Work continuation.
- `src/app/layout.tsx` — OPSIQO ONE metadata.
- `src/app/globals.css` — responsive OPSIQO ONE command, navigation, queue, graph, Cortex and safety-model styles.
- `package.json` — V7.10 audit and targeted test scripts; no dependency changes.

## Release / operator files added

- `OPSIQO_ONE_V7_10.md`
- `RELEASE_METADATA_V7_10.json`
- `START_HERE_OPSIQO_ONE_V7_10.md`
- `CHANGE_MANIFEST_OPSIQO_ONE_V7_10.md`
- `VALIDATION_REPORT_OPSIQO_ONE_V7_10.md`
- `RUN_OPSIQO_ONE_V7_10_VALIDATION.ps1`
- `RUN_OPSIQO_ONE_V7_10_VALIDATION.cmd`

## Governance changes

The new command layer never directly writes to Firestore. It either navigates, prepares/routs into an existing governed domain, or uses the pre-existing governed AI Copilot for evidence-backed analysis.

Direct conversational execution is explicitly blocked for consequential decisions including:

- termination / firing / dismissal;
- candidate hiring, selection, rejection, decline or advancement;
- promotion, demotion, discipline or suspension;
- individual salary/pay/compensation adjustment;
- successor selection;
- approval/denial/rejection of another workflow request such as leave/timesheets/expenses;
- personnel-record deletion/purge.

The action model includes Execute as a governance capability level, but this V7.10 command implementation intentionally exposes no unrestricted direct-execute route.

## Knowledge graph privacy boundary

The foundation graph is read-only and permission scoped. It currently models only:

- Worker → Position
- Worker → Manager
- Position → Org Unit
- Position → Skill

It intentionally excludes private contact data, compensation, health, employee-relations cases and other sensitive fields. Reads are bounded, current-effective assignments are used, and graph truncation is reported rather than hidden.
