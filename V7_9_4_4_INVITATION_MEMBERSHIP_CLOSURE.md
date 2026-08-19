# OPSIQO HCM 8.5 — V7.9.4.4 Invitation Membership Closure

## UAT defect reproduced
The V7.9.4.3 UAT recording demonstrated two distinct invitation blockers for a newly invited administrator who had no active organization membership yet:

1. The invitation acceptance POST used the default `apiFetch` organization mode, which requires `opsiqo.activeOrgId`. This caused the client to stop with **"No active organization selected"** before the invitation acceptance request could reach the server.
2. The sign-in return path for an invitation could inherit `NEXT_PUBLIC_OPSIQO_DEFAULT_ORG_ID`. The sign-in flow then executed governed JIT evaluation for that unrelated/default organization and could stop with **"No active JIT identity provider matches this sign-in provider"** before returning to the invitation.

Both behaviors are incorrect for a governed invitation. The invitation token + authenticated matching email are the admission mechanism; a pre-existing tenant membership must not be required.

## V7.9.4.4 changes
- Invitation acceptance calls the organization invitation endpoint with `orgContext: 'omit'`.
- Adds a strict internal invitation-return parser.
- Sign-in discovers the invited organization from `returnTo` before default-organization fallback, so registration/password/SSO policy can be evaluated against the intended tenant.
- Server pre-render remains tenant-neutral; default organization fallback is evaluated only in the browser after explicit invitation/direct-org context.
- After password or MFA authentication, a complete invitation `returnTo` is routed directly back to `/accept-invite` before JIT or active-tenant assignment.
- JIT governance remains unchanged for normal organization-context sign-ins.
- Active organization is established only after successful invitation acceptance and `/api/me/organizations/activate`.
- Updates release marker to `8.5-v7.9.4.4`.
- Adds regression tests.

## Security properties preserved
- Invitation token remains single-use and server validated.
- Authenticated email must still exactly match the invitation email.
- No active organization context is trusted before membership creation.
- No default organization is silently assigned during invitation sign-in.
- MFA requirements remain intact.
- JIT remains enforced for normal JIT-based access paths; it is not used as a substitute for an explicit invitation.
- No Firebase deployment, traffic change, DNS change, App Check change, Secret Manager change, or production change is made by this installer.

## Exact baseline
`fa59453d3016c3c75f83a558081b4b0af299849c`

## Certification compatibility correction
- Historical release regression tests no longer pin the global product marker to an older feature version; they verify release metadata remains present, synchronized and non-regressive.
