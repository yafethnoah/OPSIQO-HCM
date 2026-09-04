# OPSIQO ONE v7.14 Change Manifest

## New domain / intelligence foundation
- `src/domain/opsiqo-one-v7-14.ts` — Launchpad and Daily Brief contracts.
- `src/lib/opsiqo-one/multilingual-intelligence.ts` — controlled locale/RTL and AI language-preservation instructions.
- `src/lib/opsiqo-one/daily-brief.ts` — permission-scoped Daily Brief aggregation.
- `src/lib/opsiqo-one/organization-launchpad.ts` — governed organization-foundation preview/apply service.
- `src/lib/opsiqo-one/navigation-intelligence.ts` — semantic/fuzzy navigation ranking.
- `src/lib/preferences/adaptive-navigation.ts` — local route-only recent/frequent/pinned navigation state.

## New workspaces / APIs
- `/daily-brief`
- `/organization-launchpad`
- organization-scoped Daily Brief API under `/api/organizations/[orgId]/opsiqo-one/daily-brief`
- organization-scoped Launchpad API under `/api/organizations/[orgId]/opsiqo-one/organization-launchpad`

## New UI infrastructure
- `src/components/daily-brief-workspace.tsx`
- `src/components/organization-launchpad-workspace.tsx`
- `src/components/language-bootstrap.tsx`
- `src/components/connectivity-banner.tsx`
- `src/components/mobile-outcome-nav.tsx`

## Existing architecture extended
- Ask OPSIQO command routing recognizes Daily Brief and Organization Launchpad.
- AI Copilot and Ask OPSIQO use the signed-in user's controlled response locale.
- Application layout initializes language/direction from existing user preference.
- Navigation uses semantic ranking, `For you`, recent/frequent behavior and pin controls while preserving five primary outcomes.
- More hub and Home quick actions surface V7.14 capabilities without new top-level navigation.
- App shell renders connectivity status and the global mobile outcome bar.
- Product identity advances to `v7.14 · HCM v8.5`.

## PWA / low-bandwidth hardening
- `public/opsiqo-sw.js` updated to static-only cache behavior for V7.14.
- `/api/` is never cached.
- authenticated navigations remain network-only.
- `public/offline.html` provides a static privacy-safe offline notice.
- manifest identifies OPSIQO ONE and adds My Work / Daily Brief / Ask OPSIQO shortcuts.

## Organization Launchpad safety boundaries
- requires organization/platform/notification permissions as applicable;
- requires workflow management when packs are selected;
- creates only explicitly selected departments;
- does not create workers or positions;
- does not grant membership roles;
- does not issue legal conclusions;
- uses V7.13 marketplace installation, so selected workflows remain disabled until separately activated;
- records an audit event.

## Certification additions
- `scripts/opsiqo85-opsiqo-one-v7-14-audit.mjs`
- `tests/opsiqo85/opsiqo-one-v7-14.test.ts`
- `RUN_OPSIQO_ONE_V7_14_VALIDATION.ps1`
- `RUN_OPSIQO_ONE_V7_14_VALIDATION.cmd`
