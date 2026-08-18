# OPSIQO HCM 8.5 — V7.9.4.1 Multi-Organization & Compensation Closure

## Baseline
- Required base SHA: `c60d3e317f5268b6705360ff9edbc307e2e2239e`
- Required source: OPSIQO V7.9.4 governed multi-organization provisioning

## Multi-organization closure
- Preserve all existing memberships when accepting a new organization invitation.
- Prevent an invitation from silently changing the role of an already-active member.
- Prevent an invitation from silently relinking an already-active membership to a different worker.
- Reconfirm invitation token existence inside the acceptance transaction before consuming it.
- Add identity-scoped, server-validated organization activation endpoint.
- Audit user-initiated and post-invitation organization activation.
- Require server validation before writing the selected organization to client active context.
- Remove normal-user navigation back to first-organization bootstrap when no active membership exists.
- Continue filtering suspended/archived organizations from the organization switcher.

## Compensation Center improvements
- Rename and reposition the module as Compensation Center.
- Add compensation-health and range-health exception queues.
- Add pay-record, salary-band, market and total-rewards coverage indicators.
- Add employee search/filtering and current-scope CSV export.
- Add a Market tab with traceable market benchmark creation and benchmark library.
- Extend position mapping to include both salary band and market benchmark.
- Add compensation-cycle budget utilization visibility.
- Surface complete cycle actions: open, HR review, approve, apply, close and cancel.
- Surface recommendation submit, approve, reject and apply controls.
- Add controlled off-cycle adjustment reason/rationale fields.
- Add compensation letter visibility and explicit release control.
- Retain pay-equity and pay-transparency human-review boundaries.
- Reload all compensation data on organization context changes.

## Deployment guardrail
This source phase does not deploy Firebase and does not change production. Deploy only an exact certified commit after `uat.opsiqo.ca` is connected and the UAT App Hosting control plane is clear.

- Validate job-family, level, salary-band and market-benchmark references before saving position compensation profiles.
- Reserve market benchmark codes to prevent silent duplicate benchmark identifiers.
- Preserve the worker's current currency, pay basis, variable target and allowances during controlled off-cycle adjustments.
