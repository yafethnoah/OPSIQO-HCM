# OPSIQO ONE v7.13 Change Manifest

## New platform capabilities
- `src/domain/opsiqo-one-v7-13.ts` — V7.13 domain contracts.
- `src/lib/opsiqo-one/agent-builder.ts` — custom-agent definition, review, independent activation, retirement, permission-gated orchestration.
- `src/lib/opsiqo-one/organizational-memory.ts` — permission-scoped internal memory retrieval and citation-to-AI-evidence projection.
- `src/lib/opsiqo-one/policy-intelligence.ts` — policy lifecycle/review/acknowledgement/editorial/overlap/workflow signals.
- `src/lib/opsiqo-one/automation-marketplace.ts` — versioned workflow packs installed disabled for review.

## New workspaces/APIs
- `/agent-builder`
- `/organizational-memory`
- `/policy-intelligence`
- `/automation-marketplace`
- organization-scoped APIs under `/api/organizations/[orgId]/opsiqo-one/...`

## Existing architecture extended
- Cortex registry adds Organizational Memory and Automation Architect agents.
- Cortex orchestration can include permission-visible approved custom agents.
- AI Governance includes active custom agents without granting domain authority.
- AI evidence retrieval includes Organizational Memory evidence.
- Ask OPSIQO routes the four V7.13 outcomes.
- Workflow service gains separately audited enable/disable operation.
- More/Admin navigation surfaces V7.13 while preserving five primary outcome destinations.

## Certification additions
- `scripts/opsiqo85-opsiqo-one-v7-13-audit.mjs`
- `tests/opsiqo85/opsiqo-one-v7-13.test.ts`
- `RUN_OPSIQO_ONE_V7_13_VALIDATION.ps1`
- `RUN_OPSIQO_ONE_V7_13_VALIDATION.cmd`
