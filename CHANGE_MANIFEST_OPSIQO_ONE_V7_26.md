# OPSIQO ONE V7.26 — Change Manifest

## Certification hardening

- Added environment snapshot/restore helpers to `RUN_OPSIQO_ONE_V7_26_VALIDATION.ps1`.
- Public browser smoke restores the caller's previous `OPSIQO_A11Y_BASE_URL`.
- Authenticated emulator UAT restores all pre-existing Firebase/demo environment variables exactly after the local demo phase.
- Added V7.26 preflight contracts proving environment restoration is present.
- Certification ledger remains sanitized and stores gate metadata only.
- Certification runner continues to contain no Firebase/App Hosting deployment command.

## Multilingual closure

- Added `legacy-surface-translations-v7-26.json`.
- Added governed EN/FR/ES/AR coverage for:
  - Employee Portal
  - Employee Profile
  - Employee Relations
  - Separation / Offboarding
- Wired the four surfaces to the shared `useLegacySurfaceTranslation` implementation.
- Updated shared legacy surface translator to V7.26 catalog.
- Added V7.26 translation inventory with obvious JSX/code-fragment filtering.
- Updated Translation Readiness to V7.26 snapshot.

## Accessibility UAT

- Added V7.26 authenticated accessibility harness.
- Added employee, employee-relations, separations and seeded employee-profile routes.
- Added reviewed Arabic marker assertions on those routes.

## Certification/tests

- Added V7.26 source audit.
- Added V7.26 targeted Vitest contract.
- Added V7.26 package scripts for audit, translation inventory, authenticated accessibility and preflight.
- Preserved the full V7.25→V7.10 and HCM/MFA/ATS/ESS/automation regression lineage.

## Safety boundaries unchanged

- Safe Execute remains only `notifications.mark_visible_read`.
- Consequential employment firewall remains first.
- No normal Cortex agent receives unrestricted Execute.
- No production deploy action is introduced.
