# Upgrade to OPSIQO HCM v3.2

## Upgrade objective
v3.2 turns the v3.1 Integration Command Center from a governed data-exchange control plane into a bounded executable integration runtime while retaining staging, reconciliation, privacy, audit and consequential-employment boundaries.

## Added runtime components
- `src/domain/integration-runtime.ts`
- `src/lib/integration/runtime-schemas.ts`
- `src/lib/integration/runtime-utils.ts`
- `src/lib/integration/runtime-adapters.ts`
- `src/lib/integration/runtime-service.ts`
- `src/lib/integration/secret-provider.ts`
- signed webhook API under `/api/integrations/webhooks/...`
- organization runtime APIs under `/api/organizations/[orgId]/integrations/runtime/...`
- `src/components/integration-runtime-center.tsx`
- `scripts/run-integration-runtime.ts`
- `tests/integration-runtime.test.ts`

## Data model additions
v3.2 adds server-only records for adapter profiles, adapter code indexes, runtime state/circuit evidence, schedules, schedule code indexes, webhook receipts, webhook replay-signature indexes, replay requests and sandbox evidence.

No migration copies credentials or worker payloads into browser-readable collections.

## Configuration changes
Update the release version to `3.2.0` and review:
```text
OPSIQO_ENABLE_EXTERNAL_INTEGRATIONS
OPSIQO_INTEGRATION_HOSTS
OPSIQO_WEBHOOK_MAX_BODY_BYTES
```
Built-in secret resolution supports `env://NAME`. Existing connector secret references using another provider remain references but runtime execution fails closed until that provider is implemented in the deployment.

## Connector compatibility review
Before activating an existing v3.1 connector in v3.2:
1. Confirm connector protocol and direction.
2. Confirm HTTPS/SFTP host is public and production allow-listed.
3. Confirm the approved contract remains compatible.
4. Create an adapter profile with an appropriate adapter kind.
5. Configure relative resource paths only.
6. Configure bounded retry/circuit policy.
7. Run sandbox validation with synthetic data.
8. Independently approve/activate the profile.
9. Execute manually before scheduling.

## Signed webhook migration
Inbound webhook connectors should use `hmac_secret` and an approved secret reference. The runtime rejects stale timestamps, invalid HMAC signatures and replayed signatures. Existing webhook implementations without cryptographic verification must not be treated as v3.2-compliant merely because the connector exists.

## SFTP migration
SFTP is an extension point, not a bundled transport. Existing SFTP connector metadata can remain stored, but no SFTP adapter should be activated until an approved deployment-specific `SftpRuntimeProvider` is registered and tested.

## Outbound boundary
v3.2 outbound runtime executes only from governed server-side staging records. It deliberately does not auto-query worker/payroll/recruiting/compensation source modules to manufacture outbound payloads. A future adapter must preserve domain authorization and data-minimization controls.

## Verification
Run in an approved dependency-capable environment:
```powershell
npm install --registry=https://registry.npmjs.org
npm run release:gate
npm run typecheck
npm test
npm run test:rules
npm run build
npm run ai:evaluate
npm run ai:governance-check
npm run preflight:production
npm run uat:lifecycle
```
Commit the reviewed `package-lock.json` and use `npm ci` thereafter.
