# OPSIQO ONE v7.12 — Talent, Scenario & Value Intelligence

V7.12 implements the next controlled OPSIQO ONE intelligence layer on top of V7.11. It deliberately reuses existing OPSIQO domain services instead of introducing parallel AI scoring or simulation stores.

## New capabilities

- **Skills Passport** — evidence-backed personal skill inventory with verified, self-reported and expired evidence clearly separated.
- **Career GPS** — target-role readiness and development roadmap derived from existing Career + Learning evidence.
- **Internal Talent Marketplace** — self-only opportunity matching against configured role requirements; no employee ranking or automatic selection.
- **Scenario Lab** — read-only comparison of deterministic Workforce Planning scenarios plus the bounded permission-scoped Knowledge Graph as an organizational digital-twin foundation.
- **AI Value Dashboard** — measured AI runs, safety blocks, insufficient-evidence runs, action plans, evidence completeness, confidence and governance state. Unvalidated time or financial ROI is intentionally `Not configured`.
- **Talent Mobility Cortex Agent** — adds Career GPS/internal mobility orchestration at `recommend` maximum action level.
- **Ask OPSIQO routing** — natural-language routing to the new V7.12 experiences.

## Safety invariants

- No V7.12 Cortex agent has an `execute` hard cap.
- Consequential employment decisions remain blocked from command execution.
- Career readiness is not a promotion/hiring/succession/compensation decision.
- Talent Marketplace compares the current worker to role requirements; it does not rank employees against each other.
- Scenario Lab does not predict individual departures, recommend layoffs or change live HR records.
- AI Value does not fabricate saved hours or dollars.
- Existing MFA, RBAC, tenant isolation, audit and domain-service boundaries remain authoritative.
