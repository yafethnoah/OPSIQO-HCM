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

## H50.1 Attendance Location Enablement

H50.1 is a direct child of frozen H50 and closes the UAT configuration UX gap discovered on the actual `https://uat.opsiqo.ca/time` surface.

Changes:
- exposes **Capture location at Clock In / Clock Out** in Time Policy creation;
- loads published governed policies and presents them by title/code instead of requiring an opaque policy ID;
- preserves the backend requirement that clock-location capture requires a published electronic-monitoring policy;
- keeps geofence mode independent from location capture;
- adds an administrator diagnostic when the selected employee's Time Policy has location capture disabled;
- keeps employee preview location separate from stored attendance evidence;
- introduces no continuous/background GPS tracking and no reconstruction of historical locations that were never captured.

## H50.2 Admin Data Control

H50.2 is a direct child of frozen H50.1.

### Mistaken employee record purge
- Organization/Super/HR administrators with `people.manage` receive a **Delete mistaken record** action.
- Deletion requires a server preflight, reason, typed employee-number confirmation and final explicit confirmation.
- Purge is blocked when the employee is linked to active membership/invitations, manages direct reports, or has protected downstream HR/time/payroll/performance/learning/safety/case/onboarding evidence.
- Core mistaken worker/person/employment/assignment/index records can be removed when safe.
- A deletion tombstone and immutable audit evidence are always retained.
- Legitimate former employees must use separation/termination, not purge.

### Organization backup
- Organization Admin and Super Admin with `platform.manage` can export a full organization-scoped backup to their device.
- Backup format is `OPSIQO_ORG_BACKUP_JSONL_GZIP_V1`.
- It includes the organization Firestore root, every descendant document, and Cloud Storage objects under `organizations/{orgId}/`.
- Backup is streamed and gzip-compressed.
- Credential-like Firestore fields are redacted and platform secret environment values are never read/exported.
- Backup request/completion/failure are audited.
- Restore is deliberately separate and governed; a backup cannot be used to bypass authoritative domain validation.

### H36 backward compatibility

H50.2 preserves the pre-existing governed duplicate-cleanup contract while adding mistaken-record deletion:
- records identified as potential duplicates retain the dedicated **Delete duplicate** action;
- other eligible administrator mistakes use **Delete mistaken record**;
- both paths retain typed employee-number confirmation, downstream-evidence blocking, deletion tombstone and audit evidence;
- the historic `employee.duplicate.delete` audit action remains stable for compatibility, while `purpose` metadata and tombstone source distinguish `duplicate_cleanup` from `mistaken_record_purge`.

### H50.3 backup confirmation normalization

Functional UAT exposed a confirmation-contract mismatch when an organization name contains leading or trailing whitespace. The maintenance snapshot previously generated the visible `BACKUP <ORG>` phrase without trimming the stored organization name, while the governed backup service trimmed it before validation. Because browser text rendering collapses trailing whitespace, an administrator could type the visible phrase exactly while the client button remained disabled.

H50.3 makes the snapshot, client enablement and server validation use the same normalized contract. Organization-name whitespace is trimmed before confirmation text is generated, the client compares trimmed confirmation values, and regression coverage preserves this behavior. Authorization, tenant scoping, redaction, audit evidence and backup contents are unchanged.

## H50.4 Live AI Activation and Contextual AI Assist

H50.4 activates the existing governed OPSIQO AI infrastructure without bypassing authoritative HCM services.

### Runtime activation
- Server-side readiness reports provider/model, governed prompt/model state and credential availability **without exposing credential values**.
- An authorized `super_admin`, `org_admin` or `hr_admin` holding both `ai.manage` and `ai.approve` can initialize the system-authored governed baseline.
- The baseline uses the configured live runtime provider and retains the existing evidence retrieval, structured-output validation, audit log, citation validation and consequential-use guardrails.
- Existing App Hosting configuration keeps the Gemini credential in Secret Manager; no provider secret is sent to the browser.

### Contextual AI Assist
- A route-aware **AI Assist** appears inside supported authenticated HCM sections.
- Recruiting: job-description, interview-guide and candidate-evidence drafts without ranking or selection.
- Onboarding: onboarding plans and welcome communications.
- People/positions: role summaries and data-quality review.
- Performance: goal/coaching drafts without ratings, promotion, discipline or PIP outcomes.
- Learning/career: development plans without promotion/succession selection.
- Policy/compliance: draft policy/process and impact explanations requiring human/legal review.
- Time/leave/expenses: anomaly explanations and neutral follow-up communications without record changes or discipline recommendations.
- Compensation/payroll: control explanations and communications without individual pay decisions.
- Employee relations: neutral summaries and investigation questions without discipline/dismissal recommendations.
- Safety, workforce analytics, strategy/org design, privacy/security/identity/integration and employee experience receive evidence-grounded drafting/explanation presets.
- Offboarding AI is limited to administrative drafts for already-authorized human processes.
- The contextual assistant performs **no direct HCM writes**. Generated content remains a draft and can only be copied/reviewed by the user.
