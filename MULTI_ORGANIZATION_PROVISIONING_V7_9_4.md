# OPSIQO HCM 8.5 — Multi-Organization Provisioning V7.9.4

This change separates the one-time first-organization bootstrap from normal tenant onboarding.

## New platform control plane

- `/platform/organizations` — create and lifecycle-manage organizations.
- `/api/platform/access` — tenant-independent platform-administrator authorization.
- `/api/platform/organizations` — list/create organizations.
- `/api/platform/organizations/{orgId}` — activate, suspend, archive, or resend the primary-admin invitation.

## Security model

Platform administration is not granted merely because a tenant role contains `platform.*` permissions. A platform administrator must pass the dedicated server authorization boundary. Supported authority sources are:

1. Active `platformAdministrators/{uid}` registry record.
2. Exact server-side `OPSIQO_PLATFORM_ADMIN_EMAILS` allow-list.
3. The controlled first-organization bootstrap founder.
4. An active `super_admin` membership.
5. Explicit local-emulator platform administration mode.

Outside the local emulator, platform administration requires a verified email and requires MFA by default (`OPSIQO_REQUIRE_PLATFORM_ADMIN_MFA=false` is the explicit opt-out and is not recommended for production).

## Organization creation

Provisioning creates:

- organization root and reserved unique slug;
- idempotency record to prevent duplicate tenants;
- root organization unit;
- Organization Administrator position and occupancy;
- primary administrator person, worker, employment and assignment records;
- worker/email/employee-number indexes;
- secure platform settings with `privileged_required` MFA policy;
- onboarding foundation state;
- organization audit evidence and platform audit evidence;
- governed single-use organization-admin invitation.

## Lifecycle

Normal organization deletion is intentionally not provided.

- Active → Suspend
- Suspended → Activate
- Suspended → Archive
- Archived organizations require exceptional administrative recovery outside the standard UI.

Tenant API access fails closed while the organization root is inactive.

## First organization bootstrap

`/setup` remains a one-time installation/recovery mechanism and still requires `OPSIQO_ALLOW_FIRST_ORG_BOOTSTRAP=true` during its controlled window. It is not used to onboard subsequent organizations.
