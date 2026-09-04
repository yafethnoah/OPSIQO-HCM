# OPSIQO 8.5 ATS + Universal Import UAT Checklist

Record PASS/FAIL, tester, timestamp and evidence reference for every item.

## ATS

- [ ] Requisition requirements can be extracted from a real job description and edited before save.
- [ ] Resume intake accepts PDF/DOCX/TXT/RTF/MD within configured size limits.
- [ ] Invalid extension/signature is rejected.
- [ ] DOCX/TXT resume parsing prefills candidate name/email/phone/LinkedIn where supported.
- [ ] Prefill does not create a candidate until the recruiter submits the form with consent.
- [ ] PDF parsing works only with configured governed AI and fails truthfully otherwise.
- [ ] ATS review shows score, band, breakdown, matched/missing requirements and evidence.
- [ ] Sensitive/protected-trait criteria are excluded from automated scoring.
- [ ] ATS score does not automatically reject, hire, advance or rank candidates by a consequential action.
- [ ] Recruiter can inspect evidence before changing application stage.
- [ ] Cover-letter draft contains no invented experience/credentials in tested examples.
- [ ] Unsupported claim review flags fabricated or unsupported statements.
- [ ] Cover-letter review shows relevance and evidence-grounding metrics.
- [ ] Recruiting RBAC and requisition scope are enforced.
- [ ] Cross-tenant ATS route access is denied.

## Universal import

- [ ] Employee CSV alias mapping works.
- [ ] Employee XLSX alias mapping works.
- [ ] Existing manager resolution works by number/email/name.
- [ ] Same-file manager resolution works and creation order is correct.
- [ ] Ambiguous manager reference blocks preview/commit.
- [ ] Manager cycle blocks preview/commit.
- [ ] Organization-unit/position capacity mismatch blocks import.
- [ ] Policy parsing extracts metadata/sections and creates draft only after clean scan + approval.
- [ ] Procedure/SOP parsing extracts ordered steps and creates draft only.
- [ ] Form parsing proposes field types and creates digital-form draft only.
- [ ] Job description parsing creates recruiting/job-architecture draft only.
- [ ] Training parsing creates training draft only.
- [ ] ZIP inventory blocks unsafe paths/oversize/unsafe compression ratio.
- [ ] ZIP child extraction places each child back into scan/review-required state.
- [ ] Duplicate SHA-256 file is detected.
- [ ] Quarantined source cannot be parsed/promoted/downloaded as trusted evidence.
- [ ] Unapproved source cannot promote.
- [ ] Google Drive/OneDrive show Not configured until actually configured.
- [ ] No imported source silently overwrites authoritative employee/compensation/policy/org data.
