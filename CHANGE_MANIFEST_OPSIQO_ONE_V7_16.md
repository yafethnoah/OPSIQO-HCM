# OPSIQO ONE v7.16 Change Manifest

## New files

- `src/domain/opsiqo-one-v7-16.ts`
- `src/lib/opsiqo-one/program-workforce.ts`
- `src/lib/opsiqo-one/safe-execution.ts`
- `src/lib/opsiqo-one/experience-readiness.ts`
- `src/lib/opsiqo-one/shell-i18n.ts`
- `src/components/program-workforce-workspace.tsx`
- `src/components/experience-readiness-workspace.tsx`
- `src/components/route-announcer.tsx`
- `src/app/program-workforce/page.tsx`
- `src/app/experience-readiness/page.tsx`
- `src/app/api/organizations/[orgId]/opsiqo-one/program-workforce/route.ts`
- `src/app/api/organizations/[orgId]/opsiqo-one/program-workforce/project/route.ts`
- `src/app/api/organizations/[orgId]/opsiqo-one/experience-readiness/route.ts`
- `src/app/api/organizations/[orgId]/opsiqo-one/meeting-actions/[draftId]/promote/route.ts`
- `tests/opsiqo85/opsiqo-one-v7-16.test.ts`
- `scripts/opsiqo85-opsiqo-one-v7-16-audit.mjs`
- `RUN_OPSIQO_ONE_V7_16_VALIDATION.ps1`
- `RUN_OPSIQO_ONE_V7_16_VALIDATION.cmd`

## Important modifications

### Program / grant workforce
- `src/domain/opsiqo-one-v7-15.ts` — funding allocations may carry an explicit `projectId`.
- `src/lib/opsiqo-one/grant-workforce.ts` — project existence, status, funding-source match and project-period constraints are enforced server-side.
- `src/lib/opsiqo-one/daily-brief.ts` — permission-scoped Program Workforce evidence may contribute bounded proactive signals.

### Meeting → Workflow
- `src/lib/opsiqo-one/meeting-actions.ts` — reviewed creator-owned actions can be promoted through the existing workflow service into a disabled manual workflow.
- `src/components/meeting-actions-workspace.tsx` — controlled promotion UI for authorized workflow managers.

### Safe Execute
- `src/domain/opsiqo-one.ts` — command mode and response contract support a low-risk execute receipt.
- `src/lib/opsiqo-one/command-router.ts` — explicit notification-read action plus Program Workforce and Experience Readiness routing; consequential block remains first.
- `src/lib/opsiqo-one/orchestration.ts` — dedicated synthetic `safe-self-service` executor; normal Cortex agent ceilings remain unchanged.
- `src/app/api/organizations/[orgId]/opsiqo-one/command/route.ts` — delegates safe execute to the authoritative executor, with no direct Firestore write path.
- `src/lib/notifications/service.ts` — audited bulk-read operation touches only unread in-app notifications whose `targetUid` equals the signed-in actor; shared role notifications remain untouched.
- `src/components/opsiqo-command-bar.tsx` — displays execution receipt and localized shell controls.

### Accessibility and multilingual experience
- `src/lib/preferences/appearance.ts` — high contrast, strong focus and underlined-link preferences added while preserving reduced motion and font scale.
- `src/components/settings-workspace.tsx` — accessibility preferences exposed in Appearance settings.
- `src/app/globals.css` — focus-visible, forced-colors, high-contrast, minimum target and route-announcer hardening.
- `src/components/app-shell.tsx` — route status announcer mounted.
- `src/components/language-bootstrap.tsx` — canonical `lang`/`dir` application plus locale-change events.
- `src/components/nav.tsx` — shared localized primary outcomes plus Program Workforce and Experience Readiness destinations; product identity advanced to v7.16.
- `src/components/mobile-outcome-nav.tsx` — localized five-outcome mobile navigation.
- `src/components/superapp-workspace.tsx` — locale preference change event emitted after save.
- `src/components/more-hub-workspace.tsx` — new specialist destinations surfaced without expanding primary navigation.

## Explicit non-changes

- No Firebase/App Hosting deployment was performed.
- No production Firestore data was modified.
- No secrets are embedded in the release.
- No normal Cortex agent was granted unrestricted Execute authority.
- No automatic legal-compliance conclusion, compensation inference, termination recommendation or personnel-record write was introduced.
