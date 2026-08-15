# OPSIQO 8.5 V7 — Video audit and People/Members import completion

## Video findings

The 94.8-second browser recording was reviewed across the major navigation states. The following behavior is visible:

- People: manual authoritative employee creation works and the employee table is populated, but the page does not expose the governed import workflow directly.
- My OPSIQO, My HR and Manager: core self-service/manager surfaces render and show truthful empty/zero states for the new local organization.
- Members: secure invitation controls are present, but employee import is not available on the page before worker-to-member linking.
- Recruiting: candidate intake includes a Resume Intake Assistant and the ATS/cover-letter studio is present; however, the ATS panel appears mostly blank until an application is selected, so the path from resume upload → candidate application → ATS review is not obvious.
- Skills & Learning, Workforce Intelligence, Governance and Regulatory Change show initial loading states during first navigation in the development server; later frames show several of these pages resolving. This is consistent with first-route development compilation and is not, by itself, evidence of an infinite production loader.
- Time & Leave, Compensation, Career/Succession and Governance overview render truthful data/empty states in the new tenant.

## V7 improvements applied

1. People now includes a first-class Employee Import panel.
2. Members now includes the same governed employee import panel for creating workers before secure invitations/member linking.
3. Employee import accepts CSV, XLSX and PDF up to 15 MB and 500 employees per preview.
4. Machine-readable PDFs are parsed locally for roster tables or labeled employee blocks.
5. Scanned/image PDFs can fall back to the approved governed AI provider when configured; if no reliable parser is available OPSIQO fails with a clear message instead of inventing fields.
6. Full-name aliases are split into first/last name only when the source explicitly supplies a name field.
7. The existing duplicate email/employee-number, org-unit/position capacity, manager matching/cycle detection, preview expiry, commit ownership, idempotency/reconciliation and authoritative `createEmployee()` controls remain intact.
8. A successful import dispatches an internal refresh event so People and the Members worker-link dropdown update immediately.
9. Importing an employee from Members does **not** create a login or membership. Secure invitation remains mandatory.
10. Universal HR Import now attempts deterministic PDF text-layer extraction before requiring AI.
11. ATS empty-state guidance now explains the direct Resume Intake Assistant path and supported resume formats before an application exists.
12. A People empty-state prop mismatch was repaired (`detail`, not `description`).

## PDF parsing boundary

PDF is not treated as magically reliable. OPSIQO uses:

`PDF signature validation → text-layer extraction → roster mapping → optional governed AI fallback → field validation → human preview → authoritative Core HR commit`.

Image-only/scanned PDFs require an approved AI parser (or conversion to a machine-readable CSV/XLSX/PDF). No OCR result or low-confidence mapping is silently committed.

## UAT required

- CSV with standard and alias headers.
- XLSX first-sheet import with manager references.
- Text-layer PDF roster with multiple employees.
- Labeled single/multi-employee PDF.
- Scanned PDF with governed AI configured and without AI configured.
- Duplicate employee number/email rejection.
- Invalid/missing org-unit + position pair.
- Position-capacity exhaustion.
- Existing manager, same-file manager and manager-cycle cases.
- People refresh after commit.
- Members worker dropdown refresh after commit.
- Verify imported worker still requires invitation to become a member.
- Resume intake → candidate application → ATS review → cover-letter generation/review.
