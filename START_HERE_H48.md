# START HERE — OPSIQO H48

This package is the Windows/web H48 platform layer focused on employee account provisioning, invitation email, password setup, automatic organization enrollment and future mobile integration.

## Windows quick start

1. Extract the ZIP to a short folder such as `D:\opsiqo\H48`.
2. Copy `.env.example` to `.env.local` and populate your existing UAT Firebase/Resend values. Do not paste secrets into screenshots.
3. Run `RUN_H48_WINDOWS.ps1` from PowerShell.
4. Open the local URL printed by Next.js, or deploy to the existing UAT environment after local verification.

## UAT path

- Open **People** → an Employee Profile.
- Confirm the employee has a work email.
- Use **Account & app access** → **Provision access & send invitation**.
- Verify the invitation appears under **Members & Invitations**.
- Open the email, set the password, then sign in with the employee work email.
- Confirm the employee lands in the correct organization without entering an organization ID.
- Confirm the invitation changes to accepted/active after authenticated organization discovery.

## Mobile

Android and iOS development is intentionally deferred until H48 web UAT is complete. The existing `mobile/` folder is retained only as a frozen H47 reference and must not be treated as the H48 mobile release. Configure future store/TestFlight URLs through environment variables; the invitation workflow does not need to be redesigned later.
