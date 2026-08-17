# OPSIQO HCM 8.5 — Universal Import + ATS Implementation Report

## Baseline

This package is built on the previously completed OPSIQO HCM 8.5 implementation, which already contains the Settings workspace, authentication/account settings, appearance preferences, governed Import Center, employee-creation capacity validation, invitation UX, truthful AI progress, professional Gantt, reliability/reconciliation helpers, and visible 8.1–8.4 workspaces.

## Improvements applied in this pass

### Universal HR import intelligence

- expanded import taxonomy for policy, procedure, SOP, contract, form, template, employee document, training record, organization reference, position reference, job description, employee roster and ZIP library;
- deterministic classification and structured extraction for supported text/document/tabular formats;
- governed AI enrichment for PDF/image and ambiguous sources when a configured provider is available;
- per-field target-module mapping, confidence and source evidence;
- policy/procedure metadata and section extraction;
- ordered SOP/procedure step extraction;
- digital-form field/type proposals;
- job-description and training-record extraction;
- safe ZIP inventory with entry-count, per-entry size, total size, traversal, encryption and compression-ratio controls;
- ZIP child extraction returns each child to `not_scanned` + `review_required` rather than trusting a parent scan;
- draft/proposal promotions for policies, procedures, forms, training, organization/position mapping and job descriptions;
- existing Contract Import Studio remains the authoritative contract-extraction workflow;
- imported data never silently changes employee, compensation, policy or organization truth.

### Employee information import

- broader aliases for employee/workforce source columns;
- manager resolution by employee number, email or display name;
- manager resolution against existing OPSIQO workers and workers within the same import file;
- ambiguous/unresolved manager failures;
- cycle detection for same-file reporting relationships;
- manager-before-subordinate creation order;
- organization-unit/position capacity validation remains fail-closed;
- server-owned preview and reconciliation semantics preserved.

### ATS resume review

- deterministic resume parsing for DOCX/TXT/RTF/Markdown;
- governed AI enrichment and PDF parsing when configured;
- transient resume intake that prefills the candidate form before persistence;
- SHA-256 resume-source metadata and parser provenance;
- explainable weighted job-evidence scoring;
- explicit assessed-dimension coverage so missing requisition criteria are not treated as perfect matches;
- requirement, skill, responsibility, experience, education/certification and document-quality breakdown;
- matched/missing requirements and job signals;
- evidence matrix with confidence and snippets;
- scoring version and job/resume hashes for traceability;
- protected/sensitive criteria removed from automated scoring and job-description requirement extraction;
- no ATS-driven auto-hire, auto-reject or automatic application-stage transition.

### Job-description intelligence

- extracts recruiter-reviewable must-have requirements, preferred qualifications, responsibilities, skills, education/certification signals and requested experience years;
- filters protected/sensitive criteria from automated requirement extraction and warns the recruiter;
- writes proposed requirements only into the recruiter form for review before requisition creation.

### Cover letters

- deterministic evidence-grounded fallback;
- governed AI draft when configured;
- professional, concise and warm tones;
- AI prompt receives matched evidence snippets rather than unrestricted candidate speculation;
- cover-letter review calculates role relevance and evidence grounding;
- unsupported/fabricated-looking claims are flagged for verification/removal;
- missing job signals are suggestions only where truthful;
- drafts require human review and do not send themselves.

## Governance boundaries retained

- multi-tenant organization scope;
- recruiting permission checks and hiring-manager requisition scope;
- no direct AI-to-Firestore consequential writes;
- no protected-trait inference/ranking;
- no automatic employment decision from ATS score;
- no unreviewed authoritative import promotion;
- uncertain partial writes require reconciliation;
- cloud connectors remain `Not configured` unless actual credentials/authorization exist;
- external files are treated as untrusted evidence, never prompt instructions.

## Environment-dependent items

The following cannot be truthfully marked operational by source code alone:

- Google Drive / OneDrive / SharePoint direct OAuth connectivity;
- production email-provider delivery;
- production Firebase/App Check/MFA configuration;
- production malware/DLP evidence;
- governed Gemini/OpenAI availability and approved model/prompt records;
- deployed cross-role/cross-tenant UAT;
- production backup/restore, cutover and rollback evidence.

## Required final validation

Run `RUN_OPSIQO_8_5_UNIVERSAL_IMPORT_ATS_VALIDATION.ps1` on the Windows project. A full PASS is required before treating this modified package as a new code-green candidate.
