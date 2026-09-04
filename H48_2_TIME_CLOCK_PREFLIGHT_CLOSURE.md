# OPSIQO H48.2 — Time Clock Preflight Closure

## UAT defect

Real-browser UAT on `https://uat.opsiqo.ca/time` showed that the Timecard rendered active Clock in / Clock out controls even when the employee had no usable active time policy. Clicking Clock in could request browser geolocation before the policy/timecard precondition had been satisfied.

## H48.2 corrections

- Missing or broken time policy state is handled locally in the Timecard instead of collapsing the broader Time & Leave workspace.
- Clock in is enabled only when the current employee has a ready timecard and no open clock entry.
- Clock out and break-minute entry are enabled only when a single open clock entry is represented by the current timecard.
- Browser geolocation is requested only when `captureGeolocation` is enabled or geofencing is active in the current time policy.
- Location denial/unavailability/timeout is shown inline in the Timecard.
- The UI explicitly states whether the current attendance policy collects location.
- Offline attendance no longer forces location evidence when the active policy does not require location.
- Server offline-sync identity is based on paired `offlineEventId` + `clientCapturedAt` metadata rather than depending on location evidence being present.

## Governance boundary

H48.2 does not auto-create an HR time policy. HR must deliberately create and assign a governed policy/profile. Geolocation or geofencing remains subject to the existing published electronic-monitoring-policy prerequisite.

## Validation

Run `RUN_H48_2_VALIDATION.ps1` after applying the patch. The release gate includes the H48.2 static audit, H48.2 targeted tests, H48.1 regression tests, TypeScript, and a Next.js production build against the UAT Firebase web configuration. Secret values are not printed or committed.
