# OPSIQO ONE v7.11 Change Manifest

## New domain/service foundations

- `src/domain/opsiqo-one-v7-11.ts`
- `src/lib/opsiqo-one/agent-governance.ts`
- `src/lib/opsiqo-one/orchestration.ts`
- `src/lib/opsiqo-one/smart-forms.ts`
- `src/lib/opsiqo-one/natural-analytics.ts`
- `src/lib/opsiqo-one/compliance-radar.ts`
- `src/lib/opsiqo-one/concierge.ts`
- `src/lib/opsiqo-one/manager-copilot.ts`

## New APIs

- `/api/organizations/[orgId]/opsiqo-one/agent-governance`
- `/api/organizations/[orgId]/opsiqo-one/agent-governance/[agentId]`
- `/api/organizations/[orgId]/opsiqo-one/concierge`
- `/api/organizations/[orgId]/opsiqo-one/manager-copilot`
- `/api/organizations/[orgId]/opsiqo-one/compliance-radar`
- `/api/organizations/[orgId]/opsiqo-one/analytics`

## New user workspaces

- `/concierge`
- `/manager-copilot`
- `/compliance-radar`
- `/ai-governance`

## Updated

- Ask OPSIQO command API and command result rendering.
- Intelligence hub with natural-language aggregate analytics.
- More hub and specialist navigation.
- Employee Portal contextual link to Employee Concierge.
- Manager Portal contextual link to Manager Copilot.
- OPSIQO ONE identity advanced to v7.11 while preserving HCM v8.5 lineage.
- V7.11 architecture audit + regression test entry points.
