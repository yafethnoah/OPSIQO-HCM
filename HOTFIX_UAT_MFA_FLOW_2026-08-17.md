# OPSIQO UAT MFA Flow Hotfix — 2026-08-17

This hotfix repairs the client-side experience around the existing fail-closed server MFA policy. It does not weaken `mfa_required`, change Firebase project configuration, enable TOTP, deploy, or modify production resources.

## Changes

- Structured client `ApiRequestError` retains HTTP status, server error code, message, and details/issues.
- `apiFetch()` and `apiDownload()` preserve structured API failures.
- Settings and My OPSIQO render a terminal MFA-required security state rather than an endless loading state or generic load error.
- Privileged settings/dashboard data is cleared and withheld whenever `mfa_required` is observed.
- Added `/mfa/setup` for authenticated TOTP enrollment with verified-email enforcement, password reauthentication where applicable, authenticator URI/manual key, OTP verification, secret-state cleanup, and forced ID-token refresh.
- Enrollment deliberately requires a fresh post-enrollment sign-in so OPSIQO does not assume factor enrollment itself proves the current privileged session completed MFA.
- Password and redirect sign-in now handle `auth/multi-factor-auth-required`, accept only supported TOTP factors, and complete sign-in through `MultiFactorResolver.resolveSignIn()`.
- Internal `returnTo` destinations are sanitized against external/open-redirect values.
- Added regression coverage under `tests/opsiqo85/mfa-flow-v7-9-3-3.test.ts`.

## Operational boundary

TOTP must remain disabled in Firebase until this source passes code certification. Enabling the Firebase TOTP provider and end-to-end MFA testing are separate UAT operations after code-green status.
