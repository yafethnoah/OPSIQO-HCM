# Upgrade to OPSIQO HCM v3.1

## Scope
v3.1 adds Enterprise Integration & Data Exchange to v3.0. Existing HR modules and their authorization/approval boundaries remain authoritative.

## New permissions
- `integration.read`
- `integration.manage`
- `integration.approve`
- `integration.audit`

HR Partner receives read/manage/audit but not approve. Managers and Employees receive no enterprise Integration Center access by default.

## New server-only collections
- `integrationConnectors`
- `integrationConnectorCodeIndex`
- `integrationContracts`
- `integrationContractCodeIndex`
- `integrationRuns`
- `integrationIdempotencyIndex`
- `integrationStagingRecords`
- `integrationDeadLetters`
- `integrationReconciliations`
- `integrationEvents`

## Production configuration
When external integrations are enabled in production:
```text
OPSIQO_ENABLE_EXTERNAL_INTEGRATIONS=true
OPSIQO_INTEGRATION_HOSTS=approved.example.com,scim.vendor.example
```
Only exact public hostnames should be listed. Keep credentials in the approved server-side secret provider and place only a reference such as `secret-manager/...`, `projects/.../secrets/...`, `vault://...`, `aws-secretsmanager://...`, `azure-keyvault://...`, `gcp-secret://...` or `env://...` in the connector registry.

## Important migration rule
Do not write existing HR/employee data directly into integration staging as a substitute for source-module APIs. Staging is a transport boundary. Domain-specific validation and authorization remain required before any system-of-record change.

## Release sequence
1. Generate and review the lockfile in an approved networked environment.
2. Run the full dependency-aware gate.
3. Deploy Firestore Rules/index changes before enabling integration traffic.
4. Configure secret-provider references and exact production egress hosts.
5. Register connector and contract as drafts.
6. Independently approve them.
7. Test with non-production/synthetic records.
8. Validate reconciliation and dead-letter handling.
9. Enable scheduled `integration:review` governance monitoring.
