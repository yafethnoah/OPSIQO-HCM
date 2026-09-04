# OPSIQO H48 Validation Status

This package is a Windows/web H48 development and UAT candidate. It is **not production signed off** until the Windows validation script, UAT workflow, Firebase/Resend integration, and deployment gates pass in the target environment.

## Completed in package preparation

- H48 source-level platform audit: PASS (32 checks).
- Changed TypeScript/TSX source syntax transpilation: PASS.
- H48 test source syntax transpilation: PASS.
- Root npm lock dry-run with clean npm config: PASS (936 packages resolved).
- No `.env.local`, service-account key, or deployment secret is intentionally included.

## Required on Windows before UAT deployment

Run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_H48_VALIDATION.ps1
```

This performs the frozen dependency install, TypeScript typecheck, H48 invitation/platform tests, and Next.js production build.

## Required H48 UAT

1. Create or select an employee with a valid work email.
2. Provision account access and send invitation.
3. Verify Firebase identity is created or reused, never duplicated.
4. Verify organization membership is linked to the employee.
5. Verify branded email delivery or secure manual fallback.
6. Employee sets their own password; HR never receives it.
7. Employee signs in and OPSIQO resolves the organization automatically.
8. Verify invitation/account status becomes active and audit evidence is recorded.
9. Verify resend rotates the invitation token and revoke removes pending invitation-provisioned access.

Mobile app development resumes only after this web-platform UAT closes.
