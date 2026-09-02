# OPSIQO H42 — Recruiting parser UAT checklist

1. Confirm the App Hosting backend can access `OPSIQO_GEMINI_API_KEY`. Never print or screenshot its value.
2. Confirm the company has an approved active `RECRUITING_ATS_MODEL` profile and active `RECRUITING_ATS` prompt.
3. Deploy H42 and open **Recruiting**.
4. Select the open requisition.
5. Attach the same `ResumeJiaYeeTan.pdf` used in the failed UAT recording.
6. Confirm name, email, phone, location, LinkedIn URL and résumé text are prefilled when present.
7. If parsing fails, confirm the exact governed-AI or document-quality explanation is displayed—never the generic write-reconciliation warning.
8. Review every extracted field, record consent, and add the application.

The resume parse endpoint is transient. No candidate or application is saved until the recruiter submits the reviewed form.
