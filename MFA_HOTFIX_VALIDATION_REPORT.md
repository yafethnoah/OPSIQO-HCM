# OPSIQO HCM 8.5 V7.9.3.3 — UAT MFA Flow Hotfix Validation Report

Date: 2026-08-17

## Scope

This package repairs the client-side MFA flow while preserving the existing fail-closed server policy. It does not enable TOTP in Firebase, change production resources, deploy code, modify Firestore data, or weaken `OPSIQO_REQUIRE_ADMIN_MFA`.

## Root causes repaired

1. `apiFetch()` and `apiDownload()` discarded structured API error codes and converted server errors into generic `Error` objects.
2. Settings kept rendering its loading state after a terminal `403 / mfa_required`.
3. My OPSIQO/Home converted the MFA gate into a generic load failure.
4. Password sign-in did not resolve Firebase `auth/multi-factor-auth-required`.
5. No authenticated TOTP enrollment route existed.
6. Return routing needed a dedicated internal-only sanitizer for MFA setup/sign-in continuation.

## Implemented controls

- `ApiRequestError` preserves status, code, message, and details/issues.
- `isMfaRequiredError()` detects the authoritative `403 / mfa_required` gate.
- Settings and My OPSIQO clear privileged state and render a governed MFA-required security card.
- `/mfa/setup` requires an authenticated Firebase user and verified email.
- Password-provider users are reauthenticated before TOTP enrollment.
- TOTP setup uses `multiFactor(user).getSession()`, `TotpMultiFactorGenerator.generateSecret()`, the authenticator URI/manual key, `assertionForEnrollment()`, and `multiFactor(user).enroll()`.
- TOTP sign-in uses `getMultiFactorResolver()`, `assertionForSignIn()`, and `resolver.resolveSignIn()`.
- Unsupported MFA factor types fail closed.
- TOTP secret, OTP, password, token, and MFA-session values are not logged.
- Enrollment secret state is cleared on success/cancel/unmount.
- Post-enrollment flow requires a fresh sign-in so the privileged server gate receives a session that actually completed MFA.
- `returnTo` accepts only internal application routes and rejects absolute/protocol-relative/backslash routes.

## Validation completed in the packaging environment

| Gate | Result |
|---|---:|
| MFA hotfix static audit | PASS — 23/23 |
| Settings prerender audit | PASS — 13/13 |
| OPSIQO 8.5 completion audit | PASS — 28/28 |
| V7.9.2 certification-repair audit | PASS — 28/28 |
| V7.9.1 stabilization audit | PASS |
| V7.9 enterprise self-service audit | PASS |
| V7.8 employee portal audit | PASS |
| V7.7 automation audit | PASS |
| ATS/import audit | PASS |
| V7.9.3 UX functional closure audit | PASS |
| Firestore Rules isolation audit | PASS |
| Production-preflight truth audit | PASS |
| Firebase client isolation regression | PASS |
| Public auth/bootstrap regression | PASS |
| Lockfile review regression | PASS |
| TypeScript/TSX syntax parse | PASS — 945/945 source files |
| JS/MJS/CJS `node --check` | PASS — 35/35 |
| Clean-release audit | PASS |
| High-confidence secret scan | PASS — 0 findings |
| Source manifest | PASS |

## Full dependency-backed certification status

A clean `npm ci` was attempted in the sandbox, but the package registry lookup failed with a transient DNS/network `EAI_AGAIN` condition. Therefore this packaging environment did **not** claim the following dependency-backed gates as newly passed:

- semantic TypeScript `npm run typecheck`
- `npm run test:opsiqo85`
- full `npm test`
- `npm run release:gate`
- Firestore emulator `npm run test:rules`
- Next.js production `npm run build`

The package includes `RUN_OPSIQO_8_5_V7_9_3_3_MFA_HOTFIX_VALIDATION.ps1`, which runs those gates fail-closed on the Windows certification branch.

## Operational boundary

Do not enable TOTP in Firebase and do not deploy until the Windows validation runner passes and the resulting Git commit is reviewed.
