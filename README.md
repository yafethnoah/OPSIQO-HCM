# OPSIQO HCM — v3.6.1 Production Evidence Closure & Cloud DR Execution

v3.6.1 turns the final production-acceptance gap into a machine-verifiable evidence chain. It adds trusted-lockfile/source-manifest binding, dedicated Gitleaks and CodeQL gates, Firestore PITR/scheduled-backup evidence capture through Google Workload Identity Federation, a manually authorized temporary-database restore exercise with sentinel integrity verification, measured RTO/RPO evidence, and a SHA-256-bound production evidence bundle. It does not manufacture a green result: without the reviewed lockfile and real CI/cloud execution, production remains blocked.

## v3.6.1 capabilities
- Added manual reviewed-lockfile bootstrap workflow; generated lockfiles are uploaded for human review and are never auto-committed.
- Added dependency-free lockfile structural reviewer and positive/negative self-test; committed lockfiles are re-reviewed before production dependency installation and the committed review artifact is SHA-256-bound into the final production evidence bundle.
- Added dependency-free exact-tree source manifest generation/verification so the lockfile and source manifest can be reviewed together and protected CI rejects unlisted release files.
- Corrected production preflight so it uses the current fail-closed readiness engine rather than the inherited v3.0 checklist.
- Explicit Firebase Admin `service_account` or `adc` mode; cloud-evidence CI uses WIF/ADC.
- `cloud:dr:capture` captures and assesses Firestore PITR, backup schedules, READY backups and backup freshness.
- Controlled `RESTORE_TEST` workflow restores the latest READY backup to an isolated temporary database, verifies a non-sensitive sentinel digest, measures RTO/RPO and verifies cleanup.
- `production:evidence:generate` binds source commit/CI run to lockfile, source manifest, SBOM, provenance, build, cloud-DR and restore-exercise hashes.
- `production:evidence:verify` fails unless every mandatory build/security/AI/UAT/cloud-DR gate is green and local artifact hashes match.
- Dedicated CodeQL v4 and Gitleaks v3 security-analysis gates.
- Production readiness requires traceable CI, cloud-DR and restore-exercise evidence references.

See `V3.6.1_ACCEPTANCE.md` and `V3.6.1_PRODUCTION_RUNBOOK.md`.

---

# OPSIQO HCM — v3.5 Enterprise Software Supply Chain, SRE & Disaster Recovery

v3.5 hardens the OPSIQO platform itself. It adds governed software-supply-chain evidence, backup/restore and disaster-recovery assurance, configuration-drift governance, platform incident/postmortem controls and SRE service objectives above the existing HCM, Integration, Identity and Security Operations layers. Platform scores are operational indicators only; they do not certify secure development, SLSA level, SBOM completeness, DR capability, compliance or availability.

## v3.5 capabilities
- CycloneDX 1.7 lockfile-inventory evidence generator that fails closed without a reviewed npm lockfile.
- SLSA provenance v1 predicate-aligned build traceability with `slsaLevelClaimed=false`.
- Protected CI software-supply-chain workflow with npm audit, bounded source scanning, SBOM, tests/build and provenance artifacts.
- Governed SBOM, supply-chain scan and build-provenance registries with independent review.
- Backup policy/evidence, restore RTO/RPO evidence and independent verification.
- DR plans/exercises, configuration baselines/drift, platform incident/postmortem and SLO/error-budget governance.
- Enterprise Command Center, Lifecycle and aggregate-only AI evidence integration.
- `platform.read/manage/approve/audit`, `/platform-reliability`, `platform:review` and server-only Firestore collections.

---

# OPSIQO HCM — v3.4 Enterprise Security Operations, Zero-Trust Access & HCM Cyber Resilience

v3.4 adds a governed HCM cyber-security operations layer above the v3.3 Identity Hub and v3.2 Integration Runtime. It records bounded security telemetry, governs incident response and privileged-access workflows, tracks break-glass/key-rotation/access-recertification evidence, supports signed SOC/SIEM exchange, and exposes aggregate security posture to Lifecycle, the Enterprise HCM Command Center and the governed AI evidence layer.

## Core v3.4 capabilities
- Security Command Center with deterministic readiness score, event/incident posture, privileged-access queue, break-glass governance, key rotation, recertification and SIEM export evidence.
- Signed external SOC/SIEM event ingress using HMAC-SHA256 over `timestamp + "." + exactRawBody`, a five-minute freshness window, 1 MiB body limit, processing lease, idempotent completed-delivery handling and bounded replay-index retention.
- Multi-tenant ingress isolation through `OPSIQO_SECURITY_EVENT_INGEST_SECRETS_JSON`, or a single secret explicitly bound to `OPSIQO_SECURITY_EVENT_INGEST_ORG_ID`.
- Security events retain hashed actor/session/IP evidence and bounded summaries rather than raw credentials, tokens, IPs or session identifiers.
- Privileged-access requests are time-bounded, MFA-gated and independently approved. Security approval alone never grants an HCM role; approved requests hand off to the independently governed Identity Hub.
- Break-glass records contain a secret-manager/vault reference only. Activations are reasoned, time-bounded and automatically return to suspended governance state after the approved window.
- Credential/key rotation and access-recertification workflows require governed evidence and independent verification/closure.
- Session signals can flag candidate anomalies such as privileged MFA gaps, privileged untrusted-device use and country-velocity candidates. They trigger review only and are not treated as conclusive compromise evidence.
- Approved SIEM export uses only an active governed REST-push Integration Runtime profile and enforces the exact production `OPSIQO_SECURITY_SIEM_HOSTS` allow-list in addition to the integration runtime's transport controls.
- Security posture is integrated into Lifecycle and the Enterprise HCM risk graph, while AI receives aggregate posture only—not raw security telemetry or worker-level conclusions.

## Consequential-use boundary
Security signals can create investigation, containment, access-review, credential-rotation and incident-response work. They cannot independently terminate, discipline, rank, compensate, promote, select, redeploy or otherwise determine an employee outcome. Identity and HCM domain services retain their own authorization and independent-review requirements.

## Local demo
```powershell
npm run dev:backend
npm run seed
npm run dev:frontend
```

Open:
- `http://localhost:3000/security-operations`
- `http://localhost:3000/identity`
- `http://localhost:3000/integrations`
- `http://localhost:3000/dashboard`

## Security governance job
```powershell
$env:OPSIQO_JOB_ORG_ID="YOUR_ORG_ID"
npm run security:review
```

## Production acceptance
```powershell
npm install --registry=https://registry.npmjs.org
npm run release:gate
npm run typecheck
npm test
npm run test:rules
npm run build
npm run ai:evaluate
npm run ai:governance-check
npm run preflight:production
npm run uat:lifecycle
```

A reviewed `package-lock.json` remains mandatory before production promotion. Keep Security Operations disabled until the required per-organization/single-tenant ingest secret controls and exact SIEM host allow-list have been configured and verified.

---

## Retained v3.3 Identity Hub

v3.3 adds a governed enterprise identity layer above OPSIQO authentication, RBAC and the v3.2 integration runtime. It supports approved OIDC/SAML federation profiles, tightly bounded JIT access, SCIM provisioning requests, access reviews, identity reconciliation and aggregate identity-assurance signals without allowing federation or provisioning automation to determine employment status.

## Core identity capabilities
- Governed OIDC and SAML provider registry with independent review, activation and recurring metadata validation.
- Firebase Authentication / Identity Platform provider IDs (`oidc.*` / `saml.*`) kept as deployment configuration references rather than storing IdP secrets in OPSIQO.
- Production metadata egress protection: HTTPS only, DNS/public-address checks, no embedded credentials, exact `OPSIQO_IDENTITY_HOSTS` allow-list when enterprise SSO is enabled.
- OIDC discovery validation with exact issuer matching and required authorization/token/JWKS endpoints.
- SAML metadata retrieval/fingerprinting with explicit limitation: deployment IdP/Firebase configuration remains responsible for XML signature/certificate validation and protocol enforcement.
- Enterprise sign-in buttons for independently approved active OIDC/SAML profiles when public discovery is deliberately enabled.
- JIT employee activation only for an already-active worker matched by approved work email, a verified email claim, an approved active provider, allowed domain, required MFA/device assurance and at least one explicit employee-only auto-JIT mapping.
- Manager/HR/admin access, role changes, revocation/deprovisioning and external SCIM provisioning remain governed human-approval workflows.
- Role-mapping registry for approved email-domain or group claims; automatic JIT is schema-restricted to `employee`.
- Access-review campaigns with retain/revoke/escalate decisions and governed revocation requests.
- External identity inventory and reconciliation against active OPSIQO memberships/workers.
- Session assurance evidence stored as hashed UID plus role/provider/MFA/device observations; no raw token persistence.
- Approved SCIM create provisioning routed through the v3.2 integration runtime/staging boundary. Update/disable requests fail closed until a deployment-specific SCIM resource-addressing adapter is configured.
- Identity governance review automation for stale provider tests, privileged access approvals, overdue reviews and orphan identities.
- Identity readiness integrated into Lifecycle, Enterprise HCM risk dependencies and aggregate-only governed AI evidence.

## Access boundary
Federation establishes an authenticated identity; it does not establish employment authority. Existing active memberships continue through normal OPSIQO RBAC. A new federated identity cannot be auto-created as manager, HR Partner, HR Admin, Org Admin or Super Admin.

`employee_only` JIT can create only an employee membership, and only after all configured evidence gates pass. Any other requested access becomes an independently reviewed `identityAccessRequest`.

Identity provisioning does not activate, terminate, promote, compensate, discipline or otherwise change worker employment status.

## Local demo
```powershell
npm run dev:backend
npm run seed
npm run dev:frontend
```

Open:
- `http://localhost:3000/signin?orgId=demo-org`
- `http://localhost:3000/identity`
- `http://localhost:3000/dashboard`
- `http://localhost:3000/integrations`

## Identity governance job
```powershell
$env:OPSIQO_JOB_ORG_ID="YOUR_ORG_ID"
npm run identity:review
```

## Production acceptance
```powershell
npm install --registry=https://registry.npmjs.org
npm run release:gate
npm run typecheck
npm test
npm run test:rules
npm run build
npm run ai:evaluate
npm run ai:governance-check
npm run preflight:production
npm run uat:lifecycle
```

Generate, review and commit the trusted `package-lock.json`; use `npm ci` thereafter. Production promotion remains blocked without the dependency evidence and the existing traceable CI/UAT evidence requirements.
