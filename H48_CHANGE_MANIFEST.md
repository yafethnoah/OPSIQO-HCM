# OPSIQO H48 — Employee Account & Invitation Closure

H48 is a platform-first Windows/web release layer. The existing H47 mobile source is retained only as a frozen reference for compatibility and historical tests; it is not the active development or deployment target. Android and iOS clients will be rebuilt/closed against the H48 platform contract after web UAT.

## Implemented

- Firebase Authentication identity create-or-reuse during employee invitation.
- Server-side validation that a linked employee work email matches the invitation email.
- Organization membership provisioning at invitation time, linked to the existing worker/person record.
- Firebase password-setup/reset link generation; HR never creates, stores, or emails employee passwords.
- Branded Resend invitation email with password setup, web sign-in, and central app-download landing page.
- Manual secure-link fallback when Resend is not configured or delivery fails.
- Central `/download-app` page with environment-driven Android and iOS distribution links.
- First authenticated organization discovery finalizes a pending provisioned invitation automatically.
- Invitation expiry deactivates invitation-provisioned access when the invitation was never activated.
- Revoking a pending invitation deactivates access that was created by that invitation.
- Employee Profile now includes Account & App Access status plus Send/Resend/Revoke controls.
- Members & Invitations now shows account provisioning, delivery, activation and manual recovery links.
- Employee account-access API: `GET /api/organizations/{orgId}/employees/{workerId}/access`.
- Existing explicit secure invitation acceptance remains supported and is idempotent for the same identity.

## H48 employee flow

1. HR creates/imports the employee with a work email.
2. HR selects **Provision access & send invitation**.
3. OPSIQO creates or reuses the Firebase identity.
4. OPSIQO provisions the organization membership and worker link.
5. OPSIQO generates the Firebase password setup link.
6. OPSIQO sends the branded invitation email.
7. Employee sets their own password.
8. Employee signs in from web or a future Android/iOS app using the same work email.
9. Organization access resolves automatically; no organization ID is entered by the employee.
10. OPSIQO records the activation in the invitation/audit lifecycle.

## Required UAT configuration

- `APP_BASE_URL=https://uat.opsiqo.ca`
- Firebase Admin configuration for the UAT project.
- `RESEND_API_KEY` and verified `INVITATION_FROM_EMAIL` for real email delivery.
- `NEXT_PUBLIC_OPSIQO_ANDROID_APP_URL` when an approved Android distribution URL exists.
- `NEXT_PUBLIC_OPSIQO_IOS_APP_URL` when an approved TestFlight/App Store URL exists.

No secret values are included in this package.
