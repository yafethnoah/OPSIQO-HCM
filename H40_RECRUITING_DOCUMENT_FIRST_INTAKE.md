# OPSIQO H40 — Recruiting document-first intake

## Candidate application

1. Open **Recruiting** and locate **Add candidate application**.
2. Attach the candidate resume before entering manual fields.
3. OPSIQO automatically parses PDF, DOCX, TXT, RTF, or Markdown and prefills supported identity and contact fields.
4. Select the open requisition, review every extracted value, confirm consent, and submit.

Resume parsing is transient until the recruiter submits the application. A requisition is no longer required before parsing.

## Requisition

1. Open **Recruiting** and locate **Create requisition**.
2. Attach the job description before entering manual fields.
3. OPSIQO automatically parses PDF, DOCX, TXT, RTF, or Markdown and prefills the supported title, location, employment type, description, and requirements.
4. Select the organization unit, position, and hiring manager, review every extracted value, and create the draft.

Organization-specific governance fields remain manual by design.

## Compatibility retained

- H37 governed platform tenant creation remains intact.
- H39 form-event safety and Offboarding navigation remain intact.
- Human review and candidate consent remain required.

## Certification

- Targeted regression: 7/7 tests passed.
- Full regression: 129/129 files and 566/566 tests passed.
- TypeScript: passed.
- Production build: passed with 99/99 static pages generated.
