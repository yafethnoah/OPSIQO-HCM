# Upgrade to OPSIQO HCM v3.4

v3.4 adds the HCM Security Command Center above the v3.3 Identity Hub and v3.2 Integration Runtime.

## New permissions
- `securityops.read`
- `securityops.manage`
- `securityops.approve`
- `securityops.audit`

HR Partner receives read/manage/audit but not approve. Manager and employee roles do not receive enterprise Security Operations access.

## New environment controls
```text
OPSIQO_ENABLE_SECURITY_OPERATIONS=false
OPSIQO_SECURITY_EVENT_INGEST_SECRET=
OPSIQO_SECURITY_EVENT_INGEST_ORG_ID=
OPSIQO_SECURITY_EVENT_INGEST_SECRETS_JSON=
OPSIQO_SECURITY_SIEM_HOSTS=
OPSIQO_RELEASE_VERSION=3.4.0
```
When Security Operations is enabled in production, readiness fails closed unless there is either a valid per-organization secret map or a >=32-character single-tenant secret explicitly bound to an organization ID, and the exact SIEM/SOC public-host allow-list is configured.

## New automation
```powershell
$env:OPSIQO_JOB_ORG_ID="YOUR_ORG_ID"
npm run security:review
```

## Signed SOC/SIEM ingress
`POST /api/security-events/{orgId}` requires `x-opsiqo-timestamp` and `x-opsiqo-signature`. The signature is HMAC-SHA256 of `timestamp + "." + exactRawBody`. The endpoint accepts JSON security-event evidence, rejects stale deliveries, leases concurrent processing, returns completed duplicates idempotently, permits controlled retry of rejected processing within the freshness window, and stores no raw credential/token payload.

## Important boundary
Security Operations records and scores are operational cyber-risk evidence. They cannot determine employment status or authorize discipline, termination, performance, compensation, succession, or other consequential HR outcomes. Privileged-role changes continue through the independently governed Identity Hub.
