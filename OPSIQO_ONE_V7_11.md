# OPSIQO ONE v7.11 — Cortex, Concierge & Governance

V7.11 is the second controlled AI-native implementation layer built on the V7.10 OPSIQO ONE foundation.

## Implemented

- Cortex multi-agent orchestration plans for Ask OPSIQO.
- Explainability payload on command outcomes: evidence, policy boundary, reasoning summary, missing information, confidence and human-decision status.
- Intelligent form previews that prefill only governed known values and leave required unknowns blank.
- Deterministic natural-language workforce analytics sourced from People Analytics snapshots with evidence references and data-quality warnings.
- Employee Concierge built from SuperApp + Experience/Service Center evidence.
- Manager Copilot built from manager-scoped SuperApp/team evidence.
- Compliance Radar built from the authoritative compliance dashboard.
- AI Governance Center with per-agent enable/disable, organization action-level cap and Shadow Mode.
- Hard code-defined agent safety caps that organization configuration can tighten but never exceed.
- Audit logging for agent-governance changes.

## Safety boundary

V7.11 does not introduce unrestricted autonomous employment decisions. Current Cortex agents remain hard-capped below unrestricted `execute`. Termination, candidate selection/rejection, promotion/demotion/discipline, individual compensation changes, succession selection, approval/denial of another person's request and personnel-record deletion remain human-governed.

The Ask OPSIQO route contains no direct Firestore write path. Authoritative writes remain inside existing OPSIQO domain services.
