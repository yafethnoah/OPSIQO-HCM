# OPSIQO H41 — Resume PDF safety and setup guidance

## Repairs

- Rejects corrupted, binary-like, mojibake, and insufficient PDF text before deterministic candidate parsing.
- Uses the governed Recruiting ATS AI parser when a PDF has no reliable text layer.
- Never reports a successful parse for unusable PDF text.
- Clears candidate fields before parsing and after any parsing failure so corrupted values cannot remain in the form.
- Preserves automatic parsing and prefilling for readable PDF, DOCX, TXT, RTF, and Markdown resumes.
- Adds direct Organization and People setup guidance when missing organization units, positions, or active managers block requisition creation.

## Human review

All extracted data remains transient until the recruiter reviews the values, selects a requisition, records candidate consent, and submits the application.

## Known validation requirement

The exact PDF observed in UAT must be retested after deployment. If it has no usable text layer, OPSIQO will require the approved Recruiting ATS AI provider or a text-based PDF/DOCX replacement rather than filling corrupted data.
