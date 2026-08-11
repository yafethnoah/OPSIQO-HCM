# OPSIQO HCM v3.6.1 Architecture — Production Evidence Closure & Cloud DR Execution

## Evidence boundary
v3.6.1 converts production acceptance from a checklist into a traceable evidence chain. It does not change the HCM decision boundary and it does not turn cloud metadata into certification.

```text
Reviewed package-lock + SOURCE_MANIFEST
             ↓
Protected CI: npm ci / audit / Gitleaks / CodeQL / static scan
             ↓
SBOM + typecheck/tests/Rules/build + AI checks + preflight + deployed UAT
             ↓
Build artifact + release provenance
             ↓
GitHub OIDC / Google Workload Identity Federation
             ↓
Firestore database/PITR + backup schedules + READY backup metadata
             ↓
Explicitly authorized temporary restore exercise
             ↓
Independent sentinel digest verification + measured RTO/RPO + cleanup
             ↓
SHA-256-bound production evidence bundle
             ↓
Independent acceptance → deployment evidence references
```

## Cloud recovery boundary
The metadata collector verifies the observed Firestore control state against the explicitly configured policy (`requirePitr`, `requireScheduledBackup`, maximum backup age). It does not infer recoverability. Application-level recovery evidence requires a separate restore to a new temporary database and independent sentinel verification.

The restore exercise never targets the active production database. It filters backups to the exact captured production Firestore database resource, selects that database’s latest `READY` backup, restores into a run-specific temporary database, verifies a pre-approved non-sensitive sentinel by canonical JSON SHA-256, measures RTO/RPO, and attempts verified cleanup.

## Supply-chain / release evidence
The production evidence bundle requires green evidence for the lockfile, source manifest, dependency install/audit, dedicated secret scan, CodeQL, bounded source scan, SBOM, typecheck, tests, Rules tests, build, AI evaluation/governance, preflight, deployed UAT and provenance. The bundle hashes the principal artifacts and binds them to a source commit and CI run.

## Authentication
Firebase Admin now supports explicit `service_account` and `adc` modes. The production-evidence cloud workflow uses GitHub OIDC / Google Workload Identity Federation and ADC to avoid introducing a long-lived Google service-account key into the workflow.

## Assurance limitations
A ready v3.6.1 evidence bundle is release-specific operational assurance. It does not certify SLSA level, complete SBOM coverage, legal compliance, security, permanent DR capability or future RTO/RPO performance. Firestore recovery evidence also does not cover Cloud Storage, external identity providers, email, payroll or third-party integrations unless those systems have their own recovery evidence.

---
# OPSIQO HCM v3.5 Architecture — Platform Reliability & Software Supply Chain

## Design boundary
The v3.5 layer governs evidence about the software supply chain and platform resilience. It does not grant infrastructure credentials, directly configure cloud backup/PITR, make employment decisions, or claim certification.

```text
Reviewed npm lockfile / Protected CI / Cloud & monitoring evidence
             ↓
Supply-chain scan + SBOM + provenance evidence
             ↓
Independent review / approved exceptions
             ↓
Backup policy + restore evidence + DR plan/exercise
             ↓
Approved config baseline + drift + platform incidents + SLOs
             ↓
Platform Reliability readiness (operational indicator)
             ↓
Lifecycle / Enterprise HCM risk / aggregate AI evidence
```

All v3.5 governance collections are server-authorized. Build provenance and SBOM evidence are traceability/inventory artifacts; a SLSA level or complete SBOM claim requires separately validated tooling/process evidence.

---

# OPSIQO HCM v3.3 Architecture — Enterprise Identity, SSO & Provisioning Hub

## Identity trust boundary
```text
Enterprise IdP
  ↓ OIDC/SAML federation
Firebase Authentication / Identity Platform
  ↓ verified Firebase ID token
OPSIQO identityFromRequest
  ↓
Existing active membership? ── yes → normal RBAC
  │ no
  ↓
Governed active provider + allowed domain + verified email + MFA/device policy
  ↓
Active worker matched by governed work-email index
  ↓
Approved active role mappings
  ├─ explicit employee-only auto-JIT mapping → employee membership only
  └─ anything else → independently reviewed identityAccessRequest
```

Provider configuration and JIT do not determine employment status. Elevated access, revocation, role changes and SCIM provisioning remain governed human workflows.

## Provider validation
OIDC profiles fetch bounded discovery metadata from the configured issuer and require exact issuer equality plus authorization, token and JWKS endpoints. SAML profiles fetch bounded metadata and require IdP metadata structure before storing a content fingerprint. All metadata destinations pass HTTPS/public-address/production-host-allow-list checks.

## Identity data boundary
Browser access is denied to identity providers, tests, mappings, external identity accounts, access requests/reviews, provisioning requests, reconciliation and session evidence. Server APIs enforce organization membership, role and explicit permissions. Raw external subjects are omitted from dashboard output; session observations hash UIDs and do not persist tokens/assertions/passwords.

## SCIM boundary
Approved SCIM create provisioning reuses the v3.2 integration runtime: governed request → approved outbound profile → integration run → server-only staging → adapter execution → run/audit evidence. Identity governance cannot use the transport to activate/terminate a worker record.

## Enterprise integration
Identity readiness is added to Lifecycle, the Enterprise HCM risk graph and permission-scoped AI evidence as aggregate metrics only.

---
# OPSIQO HCM v3.2 Architecture — Enterprise Integration Runtime & Connector Adapter Framework

## Runtime design boundary
The v3.2 runtime sits below the v3.1 governed connector/contract registry and above server-only staging. Runtime execution is transport orchestration, not employment-decision authority. Inbound data terminates in staging; outbound data must already be explicitly staged for the run.

```text
Approved connector + approved contract
              ↓
Independent adapter-profile approval
              ↓
Secret reference + endpoint/host policy
              ↓
Retry / circuit breaker / delta state
              ↓
REST | SCIM | signed webhook | governed file | SFTP provider extension
              ↓
Canonical mapping + contract validation
              ↓
Server-only staging / run evidence
              ↓
Reconciliation / dead letter / replay governance
              ↓
Authorized domain-specific service (outside integration runtime)
```

## Built-in vs extension transports
- REST/JSON and SCIM use native server-side `fetch`, exact production host allow-listing and DNS/private-address rejection.
- Signed inbound webhooks use HMAC-SHA256, a five-minute timestamp window, a short processing lease and a server-only signature index. Successfully completed duplicate delivery returns the prior result rather than reprocessing.
- JSON file exchange uses Firebase Storage objects constrained under connector-specific inbound/outbound prefixes.
- SFTP is represented by a provider interface and cannot activate unless a runtime provider is registered. The package intentionally does not ship an unverified SFTP dependency while the npm dependency gate is unavailable.
- Built-in secret resolution supports `env://NAME`. Other approved reference syntaxes remain non-secret metadata until an external provider is configured.

## State and reliability
`integrationRuntimeStates` stores cursor/ETag/SCIM pagination state, consecutive failure count, circuit state/open-until timestamp and last success/failure metadata. Scheduled occurrences combine a time-bounded scheduler lease with deterministic idempotency. HTTP response bodies and outbound runtime payloads are bounded to 5 MB; webhook bodies are separately governed. Relative REST/SCIM resource paths must remain beneath the approved connector base path. No credentials or raw webhook bodies are stored in runtime state.

---

# OPSIQO HCM v3.1 — Enterprise Integration & Data Exchange Architecture

## Design principle
v3.1 adds a server-authorized integration control plane underneath the v3.0 Enterprise HCM Command Center. It exchanges governed metadata and staged records without giving the integration layer a generic worker-mutation capability.

```text
External HRIS / Payroll / IdP / Finance / Benefits / LMS / ATS / Time
                           │
                   Approved Connector
                           │
                Versioned Data Contract
                           │
             Endpoint + Secret-Ref Governance
                           │
                  Idempotent Run Ledger
                           │
              Contract Validation / Hashing
                           │
            ┌──────────────┴──────────────┐
            │                             │
      Valid server-only             Invalid record
          staging                  Dead-letter queue
            │                             │
   Domain-specific review          Governed resolution
            │
  Authorized source-module service
            │
       OPSIQO System of Record
            │
       Reconciliation evidence
            │
 Lifecycle / Enterprise Command / Assurance
```

## Interoperability profiles
- **JSON Schema 2020-12:** contracts declare the current 2020-12 dialect. Runtime validation uses a documented, bounded OPSIQO subset covering core type/object/array/required/enum/string constraints; unsupported full-spec behavior is not claimed.
- **SCIM 2.0:** connector/contract profiles support identity interoperability aligned to RFC 7643 schema concepts and RFC 7644 protocol semantics. v3.1 does not claim a complete SCIM server implementation.
- **CloudEvents 1.0:** integration event evidence follows the core metadata shape (`specversion`, type, source, subject/time, correlation/trace metadata) and references payloads by hash/reference rather than embedding sensitive data.
- **OpenTelemetry-ready observability:** runs carry trace and correlation identifiers and expose latency/success/error metrics suitable for telemetry export. v3.1 does not bundle an external collector/exporter.

## Security boundary
- connector credentials are never stored inline; only approved secret-provider references are accepted;
- dashboard output redacts the secret-reference location to `[configured]`;
- authenticated secret references require an approved provider/path prefix;
- HTTP integrations require HTTPS;
- localhost, private/non-public IPs, mapped private IPv6 and internal hostnames are blocked;
- production may enable exact egress hosts using `OPSIQO_INTEGRATION_HOSTS` and fails readiness closed when external integrations are enabled without that allow-list;
- all ten integration collections/indexes are server-only in Firestore;
- HR Partner may read/manage/audit but cannot approve connectors/contracts or resolve governed reconciliation decisions independently.

## Staging and consequential-use boundary
Inbound records are validated and written only to `integrationStagingRecords`. Valid staged payloads are server-only; rejected records omit the payload and create a dead-letter record containing hashes/errors only. Generic integration routes can acknowledge/expire staging evidence but cannot mutate Workers, Employment, Assignments, Compensation, Recruiting outcomes, Succession or Separation records.

## Reliability
- run idempotency persists only a connector-scoped SHA-256 idempotency hash;
- rejected records do not prematurely terminate the entire active run;
- run-level completion records received/accepted/rejected counts explicitly;
- reconciliation variances are separate governed records;
- degraded connectors, open dead letters and unresolved variances create deduplicated governance notifications;
- Lifecycle and Enterprise Command consume aggregate integration health only.

## Production release boundary
The v3.1 release gate requires a reviewed `package-lock.json`, security/config files, v3.1 acceptance evidence and integrated UAT route. GitHub production promotion requires dependency installation, release gate, typecheck, tests, Rules tests, production build, AI evaluation/governance, production preflight and authenticated UAT. Application-level release evidence cannot substitute for CI evidence.

---
## v3.4 Enterprise Security Operations, Zero-Trust Access & HCM Cyber Resilience

v3.4 adds a security-governance layer above Identity and Integration. It records bounded security-event evidence, governs incidents, privileged-access requests, break-glass controls, credential/key rotation and access recertification, and exposes aggregate posture to Lifecycle, Enterprise HCM Command Center and the governed AI evidence layer.

```text
IdP / App / Integration / SIEM
        ↓
Signed/bounded security event evidence
        ↓
Security Operations posture + correlation
        ↓
Human incident triage / containment plan
        ↓
Identity / Privacy / Regulatory / Integration workflows as required
        ↓
Independent approval / verification / closure
```

Security telemetry does not authorize individual employment actions. Raw credentials, authentication tokens, raw IPs and session identifiers are not persisted in the security-event record. External SIEM/SOC ingestion is HMAC-signed, replay-bounded, idempotent for completed duplicate deliveries and tenant-bound in production through per-organization secrets or a single-tenant organization binding. Security SIEM export is restricted to an approved REST-push integration profile and independently enforces the exact `OPSIQO_SECURITY_SIEM_HOSTS` allow-list.
