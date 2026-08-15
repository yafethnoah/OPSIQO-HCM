# OPSIQO 6.0.1 — SuperApp Hardening + Governed Contract Import

## Purpose
This package is a corrective release over OPSIQO 6.0. It closes the release-readiness defects identified in the Employee & Manager SuperApp and adds a governed **Contract Import** workflow for authorized HR users.

It is designed to apply after the cumulative 5.9 foundation. It does not bypass existing OPSIQO RBAC, Core HR, compensation, document, AI-governance, or audit controls.

New/updated routes:
- `/home` — hardened Employee & Manager SuperApp
- `/contract-import` — governed employment-contract intake

## What 6.0.1 repairs
1. **Preference persistence** — the client now sends only mutable preference fields accepted by the strict server schema.
2. **Permission isolation** — employee time counts require `time.read`; manager leave/time approval counts require their respective approval permissions.
3. **Compliance truthfulness** — a team with zero assessments is **Not assessed**, never 100%; partial assessment coverage is explicitly identified.
4. **Failure truthfulness** — source-service failures are represented as `unavailable`, not converted into healthy-looking zeroes.
5. **Count accuracy** — timesheet/time-exception/approval totals use count queries or pagination rather than fixed retrieval caps. Existing bounded notification/document services are explicitly labelled partial when the bound is reached.
6. **Scope truthfulness** — 6.0.1 does not claim deferred 6.0 ideas are complete. Deferred items are listed below.
7. **Accessibility** — attention severity is visible text as well as colour and is exposed to assistive technology.
8. **Localization** — the primary SuperApp labels, quick actions, attention messages, concierge, install controls and mobile navigation are localized for English, French, Spanish and Arabic/RTL.
9. **Tests** — coverage is expanded for preferences, role/action filtering, compliance assessment semantics and contract-import schemas/limits.
10. **Installer safety** — bundle hashes are verified before modification and any failed cumulative validation triggers automatic rollback to the external backup.

## Governed Contract Import
Authorized HR users receive **Import contract** in My OPSIQO quick actions.

### Supported input
- PDF
- DOCX
- TXT
- RTF
- Markdown
- maximum 10 MB

The intake validates extension/MIME plus file signatures where applicable. DOCX extraction has decompression/output limits to reduce ZIP-bomb risk.

### Extraction workflow
```text
HR user chooses contract
        ↓
Authorization: HR role + documents.read
        ↓
Size / type / file-signature validation
        ↓
SHA-256 fingerprint
        ↓
Local text extraction for DOCX/TXT/RTF/MD
        ↓
Governed AI extraction when ai.use + active model are available
(PDF requires governed AI)
        ↓
Strict structured-output validation
        ↓
Field-level source snippet + confidence
(PDF also requests source page)
        ↓
Source-provenance verification for text-extracted documents
        ↓
Employee match suggestions
        ↓
Editable human review screen
        ↓
Explicit "I reviewed" confirmation
        ↓
contractRecord + workerContractProfile + module prefill proposal
        ↓
Normal Core HR / compensation authorization remains required
```

### Extracted data surface
The parser can prefill:
- employer and employee identity;
- employee email/number;
- job title, department, manager and work location;
- employment type, start/end dates and probation;
- weekly hours and schedule;
- base pay, pay frequency, bonus/commission;
- vacation, benefits and overtime terms;
- termination/notice language;
- confidentiality, non-solicitation, non-competition and IP terms;
- governing law/jurisdiction;
- signature date and explicit signature indicators.

Missing terms remain blank. The parser is instructed not to invent missing values or provide a legal opinion.

### What gets written after confirmation
A reviewed import creates:
- `contractRecords/{contractImportId}` — confirmed extracted contract profile;
- `contractModuleSyncProposals/{contractImportId}` — separated Core HR, compensation and contract-governance prefill payloads;
- `workerContractProfiles/{workerId}` — latest confirmed contract-derived fields when an existing employee is selected.

**It does not silently change salary, job title, employment status, termination terms or other authoritative HR records.** Those changes must continue through the normal OPSIQO domain workflow and approval controls.

### AI governance
- The contract is treated as untrusted evidence, never as instructions.
- AI is invoked server-side only.
- Provider output is parsed again through a strict Zod contract.
- Every populated AI field must carry source evidence and confidence.
- Production governed mode requires dedicated active `CONTRACT_INTAKE_MODEL` and `CONTRACT_INTAKE` governance records with approval evidence.
- The source file is retained in a tenant-scoped Storage quarantine path with SHA-256 and scan status metadata.
- Browser Firebase Storage access remains denied by the platform Storage Rules.
- Source documents are marked `not_scanned` until an approved malware/DLP process marks them otherwise; this package does not claim to provide antivirus scanning.

## SuperApp data-state model
Each data source is one of:
- `available`
- `partial`
- `unavailable`
- `not_permitted`
- `not_assessed`

The UI must not represent `unavailable`, `not_permitted` or `not_assessed` as zero.

## PWA privacy boundary
The service worker caches static assets only:
- `/_next/static/*`
- `/opsiqo-icon.svg`

It bypasses API responses, navigation HTML and authenticated HR payloads. SuperApp and Contract Import APIs return:

`Cache-Control: private, no-store, max-age=0`

## Deferred experience scope — explicitly not claimed in 6.0.1
The following ideas from the original 6.0 proposal remain a later slice rather than being represented as complete:
- push-notification subscription/delivery;
- governed camera/document capture;
- dedicated benefits-link hub;
- employee-facing post-activation onboarding/offboarding task home;
- manager leave calendar;
- richer staffing cockpit;
- dedicated compensation-cycle action center.

Current deep-work routes remain available. Deferral is intentional so the release does not overstate implementation completeness.

## Apply
Stop the app and extract this package **outside** the OPSIQO project directory.

```powershell
Set-ExecutionPolicy -Scope Process Bypass

.\APPLY_OPSIQO_6_0_1_HARDENING_CONTRACT_IMPORT.ps1 `
  -ProjectRoot "D:\opsiqo\windows appweb\OPSIQO_HCM_V3_PRODUCTION_CLOSURE_BOOTSTRAP_3.6.1_2026-08-11"
```

The installer:
1. verifies all bundle SHA-256 checksums;
2. validates required cumulative foundation files;
3. creates an external timestamped backup;
4. applies the overlay and additive patches;
5. runs TypeScript, unit tests, Firestore Rules tests, production build, static scan when available, and source-manifest generation/verification;
6. automatically restores the pre-install state if any post-apply gate fails.

Do not use `npm audit fix --force` as an installation shortcut.

## UAT — SuperApp
1. Open `/home` as an employee.
2. Pin/unpin actions; refresh and verify persistence.
3. Change compact mode, locale and time zone; refresh and verify persistence.
4. Remove `time.read`; verify time counts become unavailable to that user rather than remaining visible.
5. Force a backing service failure in UAT; verify the metric says **Unavailable**, not `0`.
6. Verify a worker with no compliance result shows **Not assessed**.
7. Open as manager with a team where nobody has compliance results; verify team compliance is **Not assessed**, not 100%.
8. Add compliance results for only part of the team; verify the assessed numerator/denominator and partial state.
9. Remove `leave.approve`; verify manager leave approval totals are not exposed.
10. Remove `time.approve`; verify manager timesheet approval totals are not exposed.
11. Verify severity labels remain understandable without colour.
12. Test English, French, Spanish and Arabic RTL.
13. Inspect browser Cache Storage and verify no `/api/`, document, payroll or authenticated page payload is present.

## UAT — Contract Import
1. Sign in as an authorized HR user and open `/contract-import` from My OPSIQO.
2. Upload representative PDF, DOCX, TXT and RTF contracts.
3. Upload a renamed/invalid file and confirm signature validation rejects it.
4. Upload a file above 10 MB and confirm rejection.
5. For a known employee, confirm employee number/email/name matching proposes the correct worker.
6. Verify every AI-populated field has confidence and source evidence; for PDF, verify page evidence when returned.
7. Confirm missing contract terms remain blank rather than being inferred.
8. Modify at least one extracted value and confirm the human edit is preserved and audited.
9. Attempt confirmation without checking the explicit review box and confirm it is blocked.
10. Confirm a reviewed import and verify `contractRecords`, `contractModuleSyncProposals` and the selected `workerContractProfiles` record.
11. Verify the import does **not** directly mutate worker salary/title/status or execute a consequential employment decision.
12. Verify browser Storage rules do not permit direct client access to the quarantined contract file.
13. In production-governed configuration, verify a missing dedicated contract model/prompt fails closed.

## Validation boundary
The packaged artifact can be source/static validated independently. Production acceptance still requires running the installer against the actual cumulative OPSIQO workspace and obtaining passing evidence for:
- semantic TypeScript compatibility;
- full unit/integration tests;
- Firestore Rules emulator tests;
- production build;
- security scan;
- source-manifest verification;
- real Firebase/Storage configuration;
- governed AI configuration and provider UAT;
- document malware/DLP operational control;
- employee/manager/HR UAT;
- release, monitoring, backup/restore and DR evidence.

---

## 6.0.3 Windows PowerShell 5.1 installer correction

This maintenance build supersedes the 6.0.1 installer. The prior installer could fail in Windows PowerShell 5.1 because its source contained non-ASCII localization literals and used a .NET API that is not consistently available in Windows PowerShell 5.1.

6.0.3 changes the installer so that:

- the PowerShell installer source is ASCII-only;
- UTF-8 localization changes are performed by a Node helper that reads/writes UTF-8 explicitly;
- payload relative paths do not depend on `System.IO.Path.GetRelativePath`;
- project source files are read and written explicitly as UTF-8;
- bundle checksums are verified before any project change;
- cumulative validation failure triggers source rollback.

Run the installer from the extracted bundle directory, not from a placeholder `PATH\\TO` string:

```powershell
Set-ExecutionPolicy -Scope Process Bypass

cd "<the folder where you extracted OPSIQO_HCM_V6.0.3_BASELINE_COMPAT_HARDENING_CONTRACT_IMPORT_2026-08-13>"

.\APPLY_OPSIQO_6_0_3_BASELINE_COMPAT_HARDENING_CONTRACT_IMPORT.ps1 `
  -ProjectRoot "D:\opsiqo\windows appweb\OPSIQO_HCM_V3_PRODUCTION_CLOSURE_BOOTSTRAP_3.6.1_2026-08-11"
```

Do not type `PATH\\TO` literally. It was only a placeholder.
