## H47.1F — 2026-09-03

- Started Mobile Reproducible Build Baseline from certified H47.1E.
- Advanced Employee Mobile package to 0.2.5 and app marketing version to 0.1.2.
- Added mandatory frozen mobile package-lock workflow and npm-ci certification.
- Added deterministic EAS UAT/production environment separation and remote build versioning.
- Added one-command Windows lock-freeze, certification, clean packaging, and SHA-256 handoff.

## H47.1E — 2026-09-03

- Removed obsolete Expo SDK 57 `newArchEnabled` config.
- Added required `expo-linking ~57.0.9`.
- Isolated Expo Doctor/mobile dependency certification from the root Next.js dependency tree.
- Added temporary lock-file evidence during native certification.
- Made H47.1D historical certification checks successor-safe.
- Bumped Employee Mobile package to 0.2.4.

## H47.1D — 2026-09-03
- Fixed the Expo Router/React Navigation tab icon callback to use React Native `ColorValue` plus the navigation-provided `focused` and `size` contract.
- Made H47.1C historical identity checks successor-safe.
- Bumped the Employee Mobile package to 0.2.3.
- Added H47.1D targeted regression coverage and Windows certification runner.

## H47.1B — 2026-09-03
- Restored H41 fail-closed failed-parse clearing order.
- Made the historical H45 release-marker regression successor-aware (H45-or-later).
- Added targeted H41/H45 certification coverage and H47.1B audit.

## H47.1A — Employee Mobile Windows Certification Repair — 2026-09-03
- Isolated root Next.js TypeScript from the independent Expo mobile workspace.
- Registered H46 shift/expense domain events in the authoritative workflow trigger catalog.
- Repaired expense domain-event mapping and guaranteed an event for each successful state transition.
- Fixed mobile shared UI style declaration order and React Native font weight.
- Made Expo dependency validation non-mutating and source-manifest verification immutable.
- Added H47.1A regression audit/test coverage and Windows validation runner.

# OPSIQO ONE V7.27 — 2026-08-19

- Final certification and translation closure release; overall roadmap/source progress 99%.
- Added reviewed EN/FR/ES/AR coverage for AI Copilot, People Analytics, Scenario Lab, AI Value and MFA Setup.
- Reduced corrected translation backlog to 1,082 candidates.
- Added safe first-failure certification summary, registry-host-only diagnostics, encoded/OneDrive path warnings, and removed duplicate historical targeted test execution.
- Expanded authenticated browser UAT to five additional routes.
- Safe Execute remains frozen at notifications.mark_visible_read.

# OPSIQO HCM 8.5 V7.8 — Employee Self-Service Portal

- Added dedicated `/employee` Employee Portal as the default landing for employee-role users.
- Added self-scoped vacation/leave request and request-history experience using the existing governed Time & Leave service.
- Added self-scoped HR Service request and ticket tracking directly in the Employee Portal.
- Added permission-filtered employee access to profile, documents/policies, learning, performance, pay, career, safety and notifications.
- Added role-aware post-authentication and invitation-acceptance landing behavior.
- Preserved human approval for leave and consequential HR actions; no HR administrative permissions are granted to employee-role users.
- Added V7.8 source audit, regression tests, release documentation and immutable Windows validation runner.

# v3.6.1 — Production Evidence Closure & Cloud DR Execution

- Added artifact-only reviewed lockfile bootstrap workflow; no automatic commit/push.
- Added dependency-free committed-lockfile reviewer, self-test and pre-install enforcement across protected closure/promotion/supply-chain workflows; the protected closure binds the committed review artifact into the final evidence bundle.
- Added machine-verifiable production evidence bundle and verifier.
- Added Firestore PITR/scheduled-backup/READY-backup evidence capture.
- Added manually authorized temporary Firestore restore exercise with canonical sentinel SHA-256 verification, measured RTO/RPO and cleanup evidence.
- Added GitHub OIDC/Google Workload Identity Federation cloud-evidence workflows and explicit Firebase Admin ADC support.
- Added dedicated CodeQL v4 and Gitleaks v3 gates alongside the existing bounded source scanner.
- Corrected the inherited production preflight version/checklist drift by delegating to the current readiness engine.
- Corrected SBOM/provenance generators to derive the actual release version rather than hard-code v3.5.
- Production readiness now requires traceable production-evidence, cloud-DR and restore-exercise references.
- Production remains blocked until the reviewed npm lockfile and real CI/cloud evidence exist; v3.6.1 does not fabricate those artifacts locally.

---

# v3.5.0 — Enterprise Software Supply Chain, SRE & Disaster Recovery

- Added Platform Reliability & Software Supply Chain Command Center.
- Added independently governed CycloneDX lockfile inventory, supply-chain scan and build-provenance evidence.
- Added backup policy/evidence, restore RTO/RPO verification, DR plans/exercises, configuration drift, platform incidents/postmortems and SLO/error-budget governance.
- Added protected software-supply-chain CI workflow with reviewed-lockfile requirement, npm audit, bounded source scan, SBOM, tests/build and provenance artifacts.
- Added Platform Reliability to Lifecycle, Enterprise HCM risk dependencies and aggregate-only AI evidence.
- Added `platform.read/manage/approve/audit`, `platform:review`, integrated UAT and server-only Firestore boundaries.
- Production readiness now requires v3.5 enablement, declared backup-evidence mode and approved monitoring-source identifier while keeping actual provider evidence independently verified.
- Preserved the boundary that platform/security evidence cannot automatically create employment consequences or certification claims.

---

# v3.3.0 — Enterprise Identity, SSO & Provisioning Hub

- Added governed OIDC/SAML provider registry, metadata validation and enterprise sign-in discovery.
- Added verified-email, active-worker, allowed-domain, MFA/device and explicit employee-mapping gates for employee-only JIT.
- Added role mapping, access requests, access-review campaigns, identity-account reconciliation and session-assurance evidence.
- Added independently approved SCIM create provisioning through the v3.2 integration runtime; update/disable remains fail-closed pending a deployment-specific resource-addressing adapter.
- Added `identity.read/manage/approve/audit` permissions with HR Partner approval segregation.
- Added 13 server-only identity Firestore collections/indexes and Rules test coverage.
- Added Lifecycle, Enterprise HCM risk and aggregate-only AI evidence integration.
- Added production fail-closed checks for identity metadata host allow-list and privileged provider allow-list when enterprise SSO is enabled.
- Added v3.3 release gate, production workflow environment contract, identity governance automation, UAT route and production runbook.

---

# v3.1.0 — Enterprise Integration & Data Exchange
- Added governed connector registry, versioned canonical data contracts, idempotent run ledger, server-only staging, dead-letter and reconciliation workflows.
- Added JSON Schema 2020-12 declaration with documented bounded validation profile, SCIM 2.0/CloudEvents interoperability profiles and OpenTelemetry-ready correlation/trace metadata.
- Added HTTPS/public-host/production allow-list endpoint security and approved secret-provider references only; dashboard redacts secret-reference locations.
- Added Lifecycle, Enterprise Command Center and aggregate AI integration evidence.
- Added Integration Center RBAC, Firestore server-only boundaries, governance automation and integrated UAT route.
- Strengthened reliability by persisting only idempotency hashes and preventing record-level dead letters from prematurely terminating active batches.
- Production dependency gate remains fail-closed until a reviewed `package-lock.json` and CI evidence exist.

# Changelog

## 2.9.0 — 2026-08-11
- Added Enterprise Organizational Design & Operating Model Intelligence Center.
- Added current-state position-based structure snapshots with spans, layers, management ratios, vacancies, reporting-line integrity and explicit assumed structure-cost analytics.
- Added governed role/position architecture and approved-role-dependent decision-rights matrix.
- Added aggregate operating-model scenarios with explicit assumptions, benefit, complexity, people risk and planning-only scoring.
- Added aggregate restructuring proposals with consultation/ER/legal/privacy review evidence and independent planning approval; no individual employment-decision authority.
- Strengthened restructuring segregation so the actor recording review determinations cannot independently approve the proposal.
- Added organization-effectiveness KPIs, readiness/heatmap dashboard and independently approved Executive/Board report snapshots.
- Added Lifecycle Command Center and aggregate-only governed AI Copilot organization-design evidence.
- Added `orgdesign.read/manage/approve/audit`, `/org-design`, `orgdesign:review`, Lifecycle UAT and 13 server-only Firestore collections/indexes.
- Preserved existing privacy, assurance, resilience, strategy, AI consequential-use and legal-conclusion boundaries.

## 2.6.0 — 2026-08-10
- Added Enterprise Privacy, Data Governance & AI Assurance Center.
- Added personal-data inventory and processing-activity register.
- Added retention schedules and PIA/DPIA/AIA/transfer/vendor impact assessments.
- Added privacy-request and privacy-incident/breach governance with human-only notification decisions.
- Added vendor/processor and cross-border transfer governance.
- Added AI use-case and model-risk registers with independent approval, reassessment and consequential-employment use prohibition.
- Added `privacy.read/manage/approve/audit`, `/privacy`, `privacy:review`, lifecycle UAT and server-only Firestore controls.
- Preserved v2.0 AI consequential-use restrictions and v2.1–v2.5 legal-conclusion boundaries.

# 2.5.0 — Enterprise Compliance Evidence, Audit & Assurance Center

- Added governed assurance Evidence Vault with SHA-256 immutable metadata and append-only evidence ledger.
- Added legal hold, quarantine, restore, supersession, expiry and integrity-verification workflows.
- Added assurance/control-testing plans with independent approval and closure gates.
- Added control tests, deterministic audit sampling, evidence requests, findings and CAPA.
- Added cross-module enterprise compliance calendar and operational assurance-readiness scoring.
- Added independently approved Executive/Board/Audit Committee assurance report snapshots.
- Added `/assurance`, `npm run assurance:review`, lifecycle UAT coverage and server-only Firestore rules/tests.
- Added `assurance.read/manage/approve/audit`; HR Partner remains unable to approve assurance records.
- Preserved v2.4/v2.3/v2.1 legal-conclusion and AI consequential-use boundaries.

# 2.4.0 — Enterprise HR Policy & Regulatory Change Management

- Added governed regulatory source registry, secure fingerprint monitoring and immutable snapshot metadata.
- Added candidate change register with human triage, materiality and affected-scope mapping.
- Added regulatory obligation-to-policy/control mapping with independent approval.
- Added policy impact workflow and safe linkage to existing draft policy-version creation.
- Added exact-version employee re-attestation campaigns and progress refresh.
- Added qualified legal/specialist review queue and overdue notifications.
- Added regulatory RBAC permissions and seven server-only Firestore collections.
- Added `/regulatory`, `npm run regulatory:review`, lifecycle UAT coverage and v2.4 release gates.
- Hardened production source monitoring with an explicit host allowlist, IPv6/IPv4-mapped private-address blocking and readiness fail-closed behavior.
- Made policy-impact → draft-policy-revision creation concurrency-safe with a Firestore transaction so policy version numbering and impact linkage commit together.

---

# 2.3.0 — Enterprise HR Governance & Control Center
- Added enterprise governance control register, source-review cadence and lineage.
- Added recurring attestations, time-limited exceptions and enterprise HR risk register.
- Added independent approval boundaries and governance automation review.
- Added server-only Firestore rules for governance collections.
- Added Governance Center UI/API and lifecycle UAT coverage.
- Hardened bootstrap for Firestore batch limits.
- Removed an inherited duplicate AI rules test incorrectly nested inside `beforeAll`.


## 2.2.0 — 2026-08-10
- Added production readiness and release-engineering hardening.
- Corrected stale Phase 1 identity in the health endpoint and added release metadata.
- Added non-secret `/api/health/ready` configuration readiness endpoint with HTTP 503 on mandatory failures.
- Added Firebase project/storage configuration mismatch checks, production demo-mode enforcement and governed-AI readiness checks.
- Added `release:gate`, Node engine declaration, CI quality gates and production-readiness tests.
- Added production deployment/rollback runbook and v2.2 acceptance checklist.
- Strengthened baseline response security headers.
- No HR decision authority, legal compliance certification or autonomous consequential AI capability was added.

## 2.1.0 — 2026-08-10
- Added versioned HR Diagnostic & Compliance Intelligence framework.
- Added Ontario 2026 reference controls with source metadata and human applicability review.
- Added evidence requirements, evidence-quality grading, weighted scores and Level 1–5 maturity.
- Added deterministic findings, accepted-risk governance and remediation plans/tasks.
- Added independent assessment/remediation approval and immutable reassessment history.
- Added governed AI evidence analysis with explicit legal-conclusion prohibition.
- Added reassessment/overdue-remediation automation, workflow events, lifecycle metrics, UAT and Rules-test coverage.
- Diagnostic scores are maturity/gap indicators, not legal opinions or compliance certifications.

## 2.0.0 — 2026-08-10
- Added permission-aware AI HR Copilot and deterministic governed evidence retrieval.
- Added OpenAI Responses, Gemini structured-output and local demo adapters.
- Added strict structured-output validation, citation allow-list and evidence-bounded confidence.
- Added pre-provider consequential-employment-use blockers and regression evaluation cases.
- Added versioned prompt and model-profile registries with independent activation approval.
- Added immutable AI run lineage and AI audit history.
- Added recommendation → draft action plan → independent approval → shared workflow handoff.
- Added action-plan task execution controls.
- Added AI automation, lifecycle dashboard, preflight, UAT, Rules and governance-check integration.
- No autonomous hiring, firing, compensation, promotion, performance, discipline, accommodation or succession decisions are implemented.

## 1.9.0 — 2026-08-10
- Added People Analytics Studio.
- Added governed metric semantic layer and standard metric bootstrap.
- Added immutable daily aggregate analytics snapshots.
- Added organization-unit/location aggregation with small-group suppression.
- Added historical trend evidence and reporting-currency preservation.
- Added transparent linear-trend and rolling-average forecasts.
- Added residual diagnostics, uncertainty bands and history-quality warnings.
- Added model/run governance, independent forecast approval and workflow events.
- Added monthly analytics automation, command-center integration and UAT.
- Added forecast unit tests and Firestore server-only analytics rules coverage.
- Demo history is synthetic and explicitly labelled non-production evidence.

## 1.8.0
- Added workforce planning, deterministic scenario modelling and workforce demand governance.


## 2.7.0 — Enterprise Workforce Resilience, Business Continuity & Crisis Management
- Added governed critical-role resilience and workforce dependency mapping.
- Added workforce BIA with MTD/RTO, minimum staffing and 1–5 impact dimensions.
- Added continuity plans, crisis incident command, staffing-gap and communication logs.
- Added recovery plans with milestone governance and independent verification.
- Added resilience exercises and executive/Board reporting.
- Added `resilience.*` RBAC, server-only collections, lifecycle UAT and review automation.

## 2.8.0 — Enterprise Human Capital Strategy & Board Workforce Governance
- Added governed strategic objectives, capability gaps, scenario planning, human-capital risk appetite, initiatives/benefits realization and Board reporting.
- Added strategy RBAC, automation, server-only Firestore controls, lifecycle UAT and aggregate-only AI evidence integration.
- Strategic scenarios are planning evidence only and cannot execute consequential employment actions.

## 3.0.0 — 2026-08-11
- Added Enterprise HCM Command Center with nine cross-domain risk/readiness nodes and explicit dependency graph.
- Added governed cross-module action plans, independent approval/closure and a hard no-consequential-mutation boundary.
- Added auditable lifecycle data-quality snapshots, platform SLO governance and production release assessments.
- Added Executive/Board HCM report snapshots and aggregate Command Center evidence for the governed AI Copilot.
- Added `commandcenter:review`, production promotion GitHub Actions gates and v3.0 release/preflight checks.
- Added server-only Firestore boundaries and v3.0 RBAC for `commandcenter.read/manage/approve/audit`.
- Fixed inherited duplicate Org Design navigation entry and stale release-gate version checks.

## 3.2.0 — 2026-08-11
- Added executable integration adapter profiles for REST pull/push, SCIM Users/Groups, signed inbound webhooks, governed JSON file exchange and fail-closed SFTP provider extension.
- Added server-side `env://` secret-reference resolution plus explicit external-provider boundary for cloud vault references.
- Added deterministic field mapping/transforms, cursor/ETag/SCIM delta state, retry/backoff and circuit-breaker runtime controls.
- Added HMAC-SHA256 webhook verification, five-minute timestamp validation and server-only replay protection.
- Added governed inbound schedules, replay approval workflow, runtime state, sandbox validation and runtime dashboard.
- Added integration runtime health to Lifecycle and aggregate AI evidence.
- Hardened integration URL controls to reject embedded credentials and validate SFTP public hosts/production allow-lists.
- Inbound records remain staging-only; scheduled outbound sourcing from HCM domains remains prohibited.
- Hardened relative resource paths to remain beneath the approved connector base path and blocked secret/hop-by-hop static headers.
- Added bounded HTTP/OAuth/webhook/payload handling, corrected terminal HTTP retry classification, scheduler leasing and deterministic scheduled-run idempotency.
- Improved signed webhook delivery semantics with idempotent completed-duplicate handling, short processing leases and bounded rejection evidence.

## 3.4.0 — Enterprise Security Operations, Zero-Trust Access & HCM Cyber Resilience
- Added HCM Security Command Center, security-event evidence, incident response, privileged-access governance, break-glass controls, key rotation, access recertification and posture snapshots.
- Added HMAC-signed external SOC/SIEM security-event ingress with replay protection and bounded payloads.
- Added Security Operations permissions, server-only Firestore boundaries, lifecycle/enterprise-risk integration and aggregate-only AI evidence.
- Added fail-closed production readiness controls and the `security:review` governance job.
- Hardened v3.4 signed security ingress with per-organization/single-tenant secret binding, processing leases, idempotent completed-delivery handling, rejected-attempt retry semantics within the freshness window, and replay-index expiry cleanup.
- Restricted Security Operations SIEM export to approved REST-push runtime profiles and independently enforced the exact production `OPSIQO_SECURITY_SIEM_HOSTS` allow-list.
- Fixed the inherited Firestore Rules test nesting/scope defect and expanded v3.4 browser-denial coverage across employee, manager and HR clients.
- Corrected stale v3.4 release markers in `.env.example` and the Enterprise Command Center release-assessment form.

## OPSIQO ONE v7.14 — 2026-08-19
- Added governed Organization Launchpad.
- Added permission-scoped Daily Brief.
- Added route-only adaptive navigation, semantic menu ranking and pin/recent/frequent behavior.
- Added app-level multilingual AI response/RTL foundation.
- Added global mobile five-outcome navigation.
- Hardened PWA/offline behavior to static-only caching with no authenticated HR/API data cache.
- Preserved V7.13–V7.10 AI governance, MFA, tenant isolation, ATS and ESS controls.

## OPSIQO ONE v7.15 — Connected Workforce Operations (2026-08-19)
- Added permission-scoped Unified Human + Digital Workforce registry.
- Added Grant/Nonprofit Workforce Intelligence with server-enforced funding-period and 100% allocation controls.
- Added Employee Service Center on the existing HR service-ticket/SLA architecture.
- Added creator-private Meeting → Action drafts with content-redacted audit metadata.
- Upgraded Daily Brief with proactive funding signals and consolidated notification digest.
- Added Grant Workforce and Unified Workforce Cortex specialists.
- Preserved five-outcome navigation and all consequential employment/MFA/tenant/AI governance boundaries.

## OPSIQO ONE v7.16 — 2026-08-19

- Added Program Workforce Intelligence with explicit Project → Funding → Allocation → Worker → Position/Org Unit → funded-cost evidence.
- Added reviewed Meeting → Workflow promotion; promoted workflows are manual and disabled until separately activated.
- Added the first hard-coded Safe Self-Service Execute capability for notifications explicitly targeted to the signed-in actor; shared role notifications remain untouched.
- Added accessibility preferences, route announcements and truthful WCAG 2.2 AA readiness evidence without a conformance claim.
- Added broader English/French/Spanish/Arabic application-shell translations, Arabic RTL and evidence-preserving AI language instructions.
- Preserved all consequential-action, MFA, tenant-isolation, Agent Builder approval and workflow activation boundaries from earlier OPSIQO ONE releases.
## OPSIQO ONE v7.18 — 2026-08-19

- Added exact EN/FR/ES/AR translation catalogue for selected high-friction inherited surfaces.
- Added Translation Readiness and measurable source inventory/backlog.
- Added authenticated emulator-backed browser accessibility UAT tooling.
- Added Program Portfolio CSV and JSON evidence-pack exports with provenance/currency boundaries.
- Added explicit AI Safe Execute implementation/browser-UAT gates; allowlist remains one action.
- Preserved all consequential-action, MFA, tenant and custom-agent authority boundaries.


## OPSIQO ONE v7.26 — 2026-08-19

- Added exact EN/FR/ES/AR reviewed coverage for Employee Portal, Employee Profile, Employee Relations and Separation/Offboarding.
- Improved translation backlog accuracy by excluding obvious JSX/code fragments from the visible-string heuristic.
- Reduced the measured translation backlog to 1,389 candidates with 2,238 exact reviewed source candidates across 35 governed surfaces.
- Fixed Windows certification environment handling so public/authenticated browser UAT restores the caller's pre-existing environment variables instead of deleting them.
- Expanded authenticated browser accessibility UAT to employee lifecycle routes and reviewed Arabic markers.
- Preserved the single Safe Execute action, consequential employment firewall, tenant/MFA boundaries and no-deploy certification policy.

## V7.31 — Runtime Translation Finalization & External Certification Bridge
- Runtime-localized high-value talent, manager, automation, contract, people, lifecycle, launchpad, concierge and preboarding surfaces in EN/FR/ES/AR.
- Reduced measured translation backlog to 213 candidates across 64 governed surfaces.
- Expanded authenticated browser UAT for newly localized signed-in routes.
- Preserved Safe Execute and consequential-employment safety boundaries.

## H47.1C — Mobile Toolchain Compatibility
- Removed deprecated TypeScript 6 `baseUrl` from the Expo mobile tsconfig while preserving explicit `@/* -> ./src/*` mapping.
- Aligned Expo SDK 57 native package versions reported by Windows certification.
- Made `expo install --check` immutable/non-interactive by running it with `CI=1` during certification.
- Added H47.1C audit, targeted regression tests, validation runner, and release evidence.
