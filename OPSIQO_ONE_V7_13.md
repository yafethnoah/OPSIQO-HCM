# OPSIQO ONE v7.13 — Agent, Memory, Policy & Marketplace

## Purpose
V7.13 extends OPSIQO ONE with four governed platform capabilities: Agent Builder, Organizational Memory with explicit internal citations, Policy Intelligence, and Automation Marketplace.

## Safety architecture
- Custom agents are organization-scoped definitions with a hard maximum action level of `prepare`; `execute` is not configurable.
- A creator may submit an agent for review but may not activate their own agent. Activation requires `ai.approve` from an independent authorized user.
- AI administrators may govern all agents, but orchestration still requires the requesting actor to hold an agent-declared evidence permission.
- Organizational Memory retrieves only permission-available published policies, published knowledge articles, and workflow definitions. It does not index employee cases, health records, compensation records, or private personnel documents.
- Policy Intelligence produces lifecycle, review, acknowledgement, editorial, overlap, and workflow-impact signals. It does not issue legal-compliance or legal-applicability conclusions and does not publish policy automatically.
- Marketplace packs install versioned workflow definitions in a disabled state. Enabling a workflow is a separate `workflow.manage` action with an audit entry.
- Existing MFA, tenant isolation, RBAC, audit, Cortex authority caps, and consequential-employment blocks remain authoritative.

## Outcome surfaces
The primary navigation remains `Home | My Work | People | Intelligence | More`. V7.13 specialist workspaces sit behind More/Admin and can also be reached through Ask OPSIQO.
