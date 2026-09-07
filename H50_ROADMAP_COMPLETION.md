# OPSIQO H50 — Detailed Roadmap Completion

H50 begins from the immutable, exact-SHA UAT-deployed H49 release:

`ccf6d2514fc813cef0ec89fabe341f3a1b8903f8`

H49 is not mutated. H50 is a new material-enhancement branch.

## What H50 adds

H50 converts the detailed 21-page roadmap requirements into concrete software contracts and testable runtime surfaces beyond H49's 24-phase convergence layer.

Implemented source improvements include:

- broader Enterprise Object Graph vocabulary, relationship quality and coverage measurement;
- richer Agent Registry with owner, purpose, tools, data scope, permissions, prohibited actions, approvals, model/version and evaluation telemetry;
- multi-factor Action Risk Score using sensitivity, financial impact, employment impact, legal impact, reversibility, scope, confidence and novelty, with H49 hard-risk tiers as an immutable floor;
- complete Explainable AI metadata contract;
- Skills Graph evidence/confidence/adjacency/development-path contracts;
- Compliance Graph change-impact and remediation planning without automated legal conclusions;
- expanded Workforce Digital Twin comparison and downstream proposal generation;
- standardized Decision Impact Preview;
- full AI HR Process Generator artifact bundle: form, rules, approvals, SLA, notifications, evidence requirements, dashboard, reporting and simulation scenarios;
- governed process lifecycle: simulation → test → UAT review → independent approval → explicit production promotion, with rollback;
- approved-hire end-to-end onboarding outcome plan;
- proactive Human Operations detection and authority classes;
- protected-trait-safe, aggregated quality-of-hire feedback;
- Payroll Control Tower preflight, anomaly and variance controls;
- Integration Fabric protocol capability/observability register for REST, webhooks, GraphQL, SAML, OIDC, SCIM, SFTP, CSV, MCP and A2A;
- six controlled first-party industry pack manifests;
- explicit enterprise trust control/evidence register;
- executable reliability SLO evaluation;
- complete roadmap mobile feature registry;
- common Voice HR intent classification with direct execution forbidden;
- permanent benchmark evaluation and human task-effort comparison;
- source-level closure register that keeps UAT, telemetry and external assurance requirements truthful.

## Important truth boundary

Software implementation does not create external assurance evidence.

H50 does not falsely claim completion of:

- independent penetration testing;
- SOC 2 Type II;
- ISO 27001;
- ISO/IEC 42001;
- production reliability SLO history;
- mobile-device performance baselines;
- human functional UAT;
- provider-specific SAML/SCIM/SFTP integrations;
- production promotion.

Those remain governed evidence gates after source implementation passes.

## Release rule

No commit, push, UAT deployment or production promotion is performed by the H50 implementation script. The branch must pass local H50 verification plus the full H49 regression/release chain before it may be frozen.

## H50 Time & Attendance Location Map

The Timecard surface now includes a privacy-governed attendance map.

Employee experience:
- the employee can explicitly select **Show / refresh my location** to see the browser location on their own device;
- that explicit map refresh is not written to OPSIQO attendance storage;
- if the active governed Time Policy requires clock geolocation, the existing clock-in/clock-out evidence is captured and the map is updated from that event;
- OPSIQO does not use background or continuous browser geolocation.

Admin/HR experience:
- authorized HR roles with `time.read` can see staff **latest clock-event locations**;
- the map never describes clock-event evidence as live GPS;
- currently clocked-in/on-break status is shown separately from the timestamped latest clock event;
- employees with no recorded clock location are counted but are not assigned fabricated coordinates;
- an HR administrator can initialize the derived map projection from existing attendance history through an explicitly audited action.

Architecture:
- `timeEntries.startEvidence` and `timeEntries.endEvidence` remain the authoritative attendance-location evidence;
- `attendanceLocationStatus` is a derived read projection updated in the same clock transaction for scalable map reads;
- no second attendance authority and no continuous tracking datastore is introduced;
- all admin responses are organization-scoped, role-restricted and `no-store`.
