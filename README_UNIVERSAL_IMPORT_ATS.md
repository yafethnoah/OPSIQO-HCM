# OPSIQO HCM 8.5 — Universal HR Import + ATS Completion

This completion pass extends the code-green 8.5 baseline and the prior Settings/Import/8.x product wiring with two production-oriented capabilities:

1. **Universal HR Import Intelligence** — classify, parse, map, review and stage employee data, policies, procedures/SOPs, contracts, forms/templates, training records, job descriptions, organization/position references and ZIP HR libraries.
2. **Explainable Recruiting ATS + Cover Letter Studio** — parse resumes, compare job-relevant evidence to requisition criteria, expose score breakdown/evidence/gaps, extract job-description requirements, and generate/review evidence-grounded cover letters.

## Universal import behavior

The import pipeline is deliberately review-first:

`source -> validation -> hash -> scan gate -> parse/classify -> field proposals -> duplicate/conflict checks -> human review -> draft/proposal/authoritative service -> audit/evidence`

### Employee CSV/XLSX

- recognizes common aliases for employee number, name, email, employment type, hire date, department/org unit, position and manager;
- resolves manager references by employee number, email or name;
- resolves managers already in OPSIQO or in the same import batch;
- detects ambiguous manager matches and same-file manager cycles;
- validates organization-unit/position pairs and available position capacity;
- server owns the preview; client cannot submit its own authoritative ready rows;
- manager rows are created before dependent subordinate rows;
- uncertain partial writes stop in reconciliation rather than blindly replaying.

### Documents and HR libraries

Deterministic extraction is available for DOCX, RTF, TXT, Markdown, JSON, CSV and XLSX where applicable. PDF/image content can be enriched by the governed AI parser when configured.

The parser can propose:

- document type and target module;
- policy/procedure title, code, version, dates, owner/approver and sections;
- ordered procedure/SOP steps;
- form labels and field types for digital-form draft conversion;
- job-description requirements/responsibilities/skills sections;
- training-record metadata;
- ZIP library inventory and child-file classifications.

Structured promotions create **drafts or proposals** unless an existing authoritative domain service explicitly owns the write. Imported content does not silently overwrite employee, compensation, policy or organization records.

ZIP child files re-enter the scan/review process individually after extraction.

### External resources

Google Drive and OneDrive/SharePoint are presented as **Not configured** until real OAuth/application configuration exists. The application does not fabricate connectivity. HRIS/payroll exports can be imported through governed file ingestion today; direct APIs require connector-specific credentials and mapping work.

## ATS resume reviewing

The ATS engine is an explainable **job-evidence assistant**, not an automated employment decision maker.

It evaluates:

- explicit requisition requirements;
- job-related skills/signals;
- responsibility overlap;
- experience-duration evidence;
- education/certification evidence;
- document completeness.

It returns:

- overall evidence-alignment score and band;
- weighted score breakdown;
- matched and missing requirements;
- matched and missing job-language signals;
- evidence snippets and confidence;
- strengths and evidence gaps;
- scoring version and hashes for traceability.

Sensitive/protected-trait criteria are excluded from automated scoring and surfaced as requiring human/legal review. OPSIQO does **not** auto-reject, auto-hire or automatically move an application stage based on ATS score.

### Resume parsing

- DOCX/TXT/RTF/Markdown: deterministic parsing works without a remote model; governed AI can enrich parsing when available.
- PDF: requires an available governed AI provider because this source package intentionally does not ship an OCR/PDF text extraction dependency.
- Resume intake parsing is transient until the recruiter submits the candidate/application with consent.
- The raw resume file is not persisted by the ATS service; the parsed evidence text/profile and file hash metadata are stored for review/audit.

## Cover letters

The ATS studio can:

- generate a professional/concise/warm cover-letter draft using only evidence supported by the submitted resume/requisition;
- use governed AI when configured, with deterministic fallback;
- review pasted/generated cover letters for role relevance and evidence grounding;
- flag claims that appear unsupported by resume evidence;
- show missing job signals as suggestions **only where truthful**;
- copy/download the draft for recruiter/candidate review.

No generated cover letter should be sent without human review.

## Job-description intelligence

Recruiters can paste/write the job description and use the assistant to propose explicit requirements. The recruiter reviews the extracted criteria before requisition creation so ATS comparisons are based on stated role requirements rather than opaque ranking logic.

## AI governance configuration

For strict production governance set:

```text
OPSIQO_REQUIRE_GOVERNED_AI_CONFIG=true
```

and configure approved active governance records for:

```text
RECRUITING_ATS_MODEL
RECRUITING_ATS
UNIVERSAL_IMPORT_MODEL
UNIVERSAL_IMPORT
```

The implementation can fall back to the existing HR Copilot model/prompt outside strict mode when one is available. Do not place provider secrets in source control.

## Full Windows validation

Run:

```powershell
powershell.exe `
  -NoLogo `
  -NoProfile `
  -ExecutionPolicy Bypass `
  -File ".\RUN_OPSIQO_8_5_UNIVERSAL_IMPORT_ATS_VALIDATION.ps1"
```

This executes `npm ci`, completion audit, ATS/import audit, TypeScript, full tests, targeted ATS/import tests, Next build, 8.x tests, Firestore Rules, security scan, integration validation, source manifest, production preflight and invitation diagnostics.

A PASS is still **code/local-environment readiness**, not production GO.

## Browser UAT that must be performed

### ATS

- create/open a real requisition with explicit requirements;
- use Job Description Intelligence and review the proposed criteria;
- parse a DOCX/TXT resume into candidate intake and verify every prefilled field;
- submit with consent and run ATS review;
- inspect evidence matrix and missing requirements;
- verify no application stage changes automatically;
- verify sensitive/protected criteria do not affect the ATS score;
- configure governed AI and test PDF resume parsing;
- generate all three cover-letter tones;
- insert an unsupported claim and verify cover-letter review flags it;
- test recruiter/manager scope and cross-tenant denial.

### Universal import

- employee CSV/XLSX with managers in OPSIQO and managers inside the same file;
- ambiguous/unresolved manager references and manager cycle rejection;
- policy, procedure, SOP, form, job description and training source parsing;
- field mapping/confidence/evidence review;
- ZIP HR library inventory and extraction;
- verify each extracted child is unscanned/review-required;
- approve and create drafts/proposals;
- verify no silent authoritative overwrite;
- duplicate hash detection, quarantine and reconciliation paths.
