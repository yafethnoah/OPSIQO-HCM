# OPSIQO H51.72 — Time & Leave + Native Alarm Reliability

Parent release: **H51.71**
Parent SHA: `646d3586819f058a30efc149acc8a096af397ac9`
Branch: `h51.72/time-leave-alarm-reliability`

## Browser UAT repairs
- Responsive administrator leave form with governed minimum field widths.
- Labels cannot collapse into character-by-character vertical rendering.
- Canonical worker selector reconciliation by worker/person identity.
- Legacy compatibility collapse requires employee number **and** normalized display name; employee number alone is never the identity key.
- H51.71 empty leave-type state, 10+ character admin reason, local feedback, and H51.70 safeguards are preserved.

## Native alarm reliability
- Android adds `android.permission.SCHEDULE_EXACT_ALARM`.
- Duplicate Android permission declarations are removed.
- Android notification channels are created before notification permission prompting.
- Every delayed attendance alarm is verified as retained by the OS scheduler.
- Attendance alarms use maximum Android notification priority.
- iOS attendance alarms use the Time Sensitive interruption level.
- Android settings include a direct Alarms & reminders access action with fallback guidance.
- Existing H51.70 exact reminder reconciliation and two-minute due-delivery grace remain intact.

## Native release
This changes native app configuration, so an OTA-only update is not sufficient. Build a fresh native UAT binary after H51.72 source certification.

Target native version:
- App marketing version: 1.0.2 (certified identity preserved)
- iOS build: 3 (EAS remote auto-increment may advance further)
- Android versionCode: 3 (EAS remote auto-increment may advance further)
- Mobile package: 0.2.5 (certified reproducible baseline preserved)

Production is not deployed by the H51.72 source-freeze script.
