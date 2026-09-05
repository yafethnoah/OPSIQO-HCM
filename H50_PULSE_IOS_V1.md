# OPSIQO H50.0 â€” Pulse iOS Foundation

Base SHA: `19da851cf11e10a0d066ada64d35b3d2f1f95b42`

## Product direction

OPSIQO Pulse is the native employee/manager companion application for OPSIQO HCM.
H50 starts with iOS while preserving one React Native / Expo codebase so Android
can follow without duplicating attendance business logic.

## H50.0 scope

- Rebrand the existing certified employee-mobile foundation as **OPSIQO Pulse**.
- Keep iOS bundle identifier `ca.opsiqo.employee` in the first controlled step.
- Keep the H47.1F version/lock baseline intact until H50 certification is frozen.
- Make attendance the primary mobile home action.
- Reuse one governed attendance component on Home and Time.
- Preserve server-authoritative clock, geofence, duplicate and audit rules.
- Preserve native biometric attendance verification.
- Preserve encrypted offline queue + governed synchronization.
- Preserve location-at-action only.
- Keep iOS background location explicitly disabled.
- Keep the UAT runtime pointed to `https://uat.opsiqo.ca` through the EAS UAT profile.

## Non-goals for H50.0

- No production mobile release.
- No Android store build yet.
- No continuous/background employee location tracking.
- No independent mobile attendance ledger.
- No bypass of OPSIQO server permissions, membership, time policy or payroll controls.
- No App Store submission before TestFlight/UAT closure.

## Next H50 gates

1. H50.1 iOS authentication/session hardening and App Check/App Attest integration.
2. H50.2 iOS attendance UAT on a physical device.
3. H50.3 notifications + device registration.
4. H50.4 timesheet/correction experience.
5. H50.5 accessibility/localization polish.
6. H50.6 TestFlight release candidate.
7. H50.7 Android adaptation using the same governed mobile domain.