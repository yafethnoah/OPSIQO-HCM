# OPSIQO Strategic Roadmap Convergence Layer

This implementation applies the strategic roadmap as a cross-cutting platform layer rather than rebuilding capabilities that OPSIQO already has.

## Architectural spine

1. Enterprise Object Graph
2. Knowledge/evidence graph
3. Governed Agent Operating System
4. OPSIQO Do plan/preview/confirm/execute boundary
5. AI Action Risk Engine R0-R6

## Existing capability convergence

Phases 6-23 are mapped to existing OPSIQO modules and governed through the same object, evidence, action-risk, explainability and scenario contracts.

## Permanent benchmark suite

Phase 24 turns the roadmap targets into executable benchmark contracts, including:
- common actions <= 3 clicks;
- conversational completion >= 80%;
- material AI outputs with evidence >= 95%;
- autonomous consequential employment decisions = 0.

## Decision boundary

AI does not directly mutate consequential HCM records. R3 actions require confirmation, R4 actions require independent approval, R5 actions require a recorded human decision, and R6 actions require specialist review. Permissions are checked at plan time and immediately before execution.

## Release rule

This strategic branch is not pushed until:
- strategic audit passes;
- strategic tests pass;
- release gate passes;
- TypeScript passes;
- full Vitest passes;
- Firestore Rules tests pass;
- production build passes;
- static security scan passes;
- source manifest is regenerated and verified;
- exact release-tree audit passes.
## H49 Step 3 - Governed Orchestrator Convergence

H49 does not introduce a second production orchestration engine. Strategic R0-R6 plans converge into the existing OPSIQO GovernedOrchestrator and ServiceBindingRegistry.

- R0-R2 map to read-only orchestration.
- R3 maps to administrative execution and requires user confirmation.
- R4 maps to high-impact administration and requires independent approval evidence plus confirmation.
- R5 maps to consequential work and cannot be directly executed by the orchestrator.
- R6 maps to consequential work, requires recorded human-decision evidence and specialist-review evidence, and cannot be directly executed.
- Existing tenant checks, execution-time permission checks, idempotency, receipts, unbound-service blocking and reconciliation remain authoritative.
- Strategic code does not write Firestore directly.
- Local bridge validation is not UAT verification.
- Domain-specific production service bindings remain the next integration step.

## H49 Step 4 - Authoritative Domain Bindings

The H49 strategic runtime now binds to existing OPSIQO authoritative domain services instead of introducing parallel persistence logic.

Bound domains:
- Core HR: employee creation and governed correction.
- Recruiting: requisition creation; candidate hire is registered as R5 consequential work and direct execution is prohibited.
- Onboarding: prehire/onboarding case creation.
- Leave: request, approve/reject and cancel are permission-separated.
- Time & Attendance: employee clock events.
- Payroll: export is treated as R4 high-impact administration; receipt references the export run and never includes CSV contents.
- Workflow: authoritative workflow start.

Execution safeguards:
- Strategic bindings contain no Firestore client/admin write calls.
- Payloads are resolved by opaque reference immediately before domain execution.
- Resolved ActorContext identity, organization scope and permission are revalidated.
- Mutating operations require orchestrator idempotency.
- Simulation does not invoke authoritative services; it must use the impact-preview path.
- Prehire access URLs and payroll CSV contents are never placed in orchestration receipts.
- Existing domain services retain their own schemas, transactions, audit logs, domain events and state-machine controls.
- Local domain-binding validation is not UAT verification.

## H49 Step 5 - Enterprise Domain Convergence

The strategic runtime now extends beyond the transaction backbone into high-impact talent, workforce and compliance domains.

Added governed bindings:
- Compensation recommendation decisions: R4, approval evidence + confirmation required.
- Performance manager assessment: R5, direct strategic execution prohibited.
- Performance calibration: R5, direct strategic execution prohibited.
- Performance improvement plan actions: R5, direct strategic execution prohibited.
- Succession nominations: R5, direct strategic execution prohibited.
- Separation actions: R6, direct strategic execution prohibited; specialist review and human decision remain mandatory.
- Employee-relations findings: consequential case evidence remains specialist/human controlled.
- Learning assignments: R3 governed execution.
- Workforce scenario creation: R3 governed planning-state write only; no workforce action is executed.
- Regulatory legal-review creation: R4 governed administrative action; legal conclusions remain specialist decisions.

Readiness evidence is upgraded only where local contract, runtime, domain adapter and validation evidence now exist. No UAT evidence is added. Exact-SHA UAT remains intentionally zero until final H49 freeze, push and deployment to the governed UAT environment.

## H49 Step 6 - Platform Capability Convergence

The roadmap is now converged against existing OPSIQO platform capabilities rather than duplicated as new modules.

Locally validated platform phases:
- Phase 8 Launch migration
- Phase 9 Zero-config
- Phase 10 One Screen UX / unified command surfaces
- Phase 11 Proactive Human Ops
- Phase 15 Integration Fabric
- Phase 16 Marketplace and Industry Packs
- Phase 19 Explainable AI
- Phase 20 Enterprise Security and Trust
- Phase 21 Reliability
- Phase 22 Mobile frontline
- Phase 24 Permanent benchmark suite

Truthful remaining gaps:
- Phase 1 Enterprise Object Graph is contract-ready but still requires broader runtime adoption evidence across authoritative domains.
- Phase 2 Knowledge Graph is contract-ready but still requires broader operational ingestion/retrieval evidence.
- Phase 17 AI HR Process Generator is domain-integrated/partial: Agent Builder, workflows and governed orchestration exist, but a dedicated natural-language HR process compiler with end-to-end generation acceptance evidence is not yet proven.
- Phase 23 Voice HR remains open: no dedicated Voice HR runtime and acceptance evidence is claimed.

This produces 20/24 locally validated roadmap phases. UAT remains 0/24 because no H49 commit has been frozen, pushed, deployed or exact-SHA validated on the governed UAT URL.

## H49 Step 7 - Final Strategic Gap Closure

All 24 strategic roadmap phases now have local contract, runtime/domain-adapter and validation evidence.

Final closures:
- Phase 1 Enterprise Object Graph: authoritative orchestration receipts are projected into canonical, tenant-scoped graph objects spanning the governed domain-binding result-reference vocabulary.
- Phase 2 Knowledge Graph: permission-scoped Organizational Memory is operationally retrieved and transformed into evidence-backed knowledge assertions.
- Phase 17 AI HR Process Generator: natural-language HR process generation produces disabled draft workflows only. R5/R6 processes contain mandatory human-control and specialist-review steps and cannot self-activate.
- Phase 23 Voice HR: a dedicated voice control plane uses the existing OPSIQO command router, plus browser speech-recognition and speech-synthesis adapters. Voice never directly executes authoritative actions and does not persist transcripts in the strategic runtime.

Local validation is not production or UAT verification. No H49 commit has yet been frozen, pushed or deployed. Exact-SHA UAT remains 0/24 until final release freeze, exact-tree audit, one governed push and validation on https://uat.opsiqo.ca.
