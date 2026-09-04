# H47 Validation Report

## Packaging-environment checks completed
- H43 recruiting regression audit: **16/16 PASS**.
- H44 structured interview audit: **27/27 PASS**.
- H45B recruiting intelligence successor-lineage audit: **21/21 PASS**.
- H46 frontline operations successor-lineage audit: **32/32 PASS**.
- H47 employee mobile architecture audit: **24/24 PASS**.
- H47 changed TypeScript/TSX syntax transpilation: **24/24 PASS** (18 mobile files + 6 backend/test files).
- Source manifest: **1856/1856 PASS, 0 errors** before final packaging.

These checks validate architecture, source shape and syntax. They do **not** substitute for dependency-resolved Windows/native builds.

## Required Windows semantic gates
1. Root `npm ci`.
2. Root TypeScript.
3. Targeted H47 + H46 + recruiting tests.
4. Full Vitest.
5. Firestore Rules tests.
6. Next.js production build.
7. Mobile dependency alignment with Expo SDK 57 (`npx expo install --fix`).
8. Mobile TypeScript.
9. Expo Doctor.
10. Source manifest generation and verification.

Run `RUN_OPSIQO_H47_VALIDATION.ps1` from the extracted project root.

## Physical-device UAT gates
- Sign in and multi-organization selection.
- Employee home data matches OPSIQO web for the same worker.
- Clock in/out and break actions on iOS/Android physical devices.
- Event-time location permission only; no background/continuous location collection.
- Local biometric verification behavior.
- Leave request appears in web OPSIQO.
- Expense receipt submission appears in web OPSIQO and enters the governed approval workflow.
- User-initiated push registration.
- Sign-out clears secure session state.

## Production hold
H47 Phase 1 is a UAT mobile foundation. Production promotion remains blocked until native Firebase App Check/device-attestation compatibility is implemented when `OPSIQO_REQUIRE_APP_CHECK=true`, and until EAS/iOS/Android build, signing, push credentials and store-distribution gates are completed. The server must remain fail-closed; do not bypass App Check for production mobile access.
