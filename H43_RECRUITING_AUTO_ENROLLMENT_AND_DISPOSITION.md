# OPSIQO H43 — Recruiting automatic enrollment and governed disposition

## Intake flow

H43 changes the H42 candidate intake from a manual final-submit workflow into a governed auto-enrollment workflow:

```text
Resume upload
  ↓
Transient resume parsing
  ↓
Prefill candidate identity/contact evidence
  ↓
Exactly one OPEN requisition? → select it automatically
Multiple OPEN requisitions?   → recruiter selects one
  ↓
Recruiter reviews extracted data
  ↓
Recruiter confirms recorded candidate consent
  ↓
Application is created automatically in Applied
  ↓
Candidate + requisition duplicate index prevents duplicate application creation
```

Candidate data is still not persisted before consent. H43 does not auto-check consent and does not infer consent from the resume.

## Requisition state truth

The server already enforced `req.status === 'open'` before creating an application. The H42 recording appeared to show a Draft requisition accepting an application because the legacy DOM translation observer could restore stale dynamic text after React changed the status. H43 repairs that React/translation synchronization defect.

## Consequential dispositions

`Rejected` and `Withdrawn` are no longer ordinary values in the pipeline Move dropdown.

Rejection now requires:

- HR recruiting scope;
- recruiting disposition permission;
- explicit human confirmation;
- a reviewed business reason;
- optional job-related evidence note;
- audit record;
- stage-change domain event.

ATS evidence can inform human review but never triggers rejection automatically.

## UAT

1. Have exactly one requisition in Open state.
2. Upload a resume such as `ResumeJiaYeeTan.pdf`.
3. Confirm first name, last name, email, phone/location/LinkedIn when present are prefilled.
4. Confirm the only Open requisition is selected automatically.
5. Review the extracted data.
6. Check the candidate-consent confirmation.
7. Confirm OPSIQO creates the application automatically in Applied without requiring another click.
8. Repeat the same candidate/requisition submission and confirm no duplicate application is created.
9. Move the application to Screening and confirm both the card and stage counter update together.
10. Confirm a requisition status change (Draft → Pending approval → Approved → Open) displays the current status instead of a stale prior status.
11. Confirm Rejected is not present in Move….
12. Use Review rejection… and confirm the disposition dialog requires a reason and explicit confirmation.
13. Confirm a hiring manager without final disposition permission cannot reject.
14. Confirm ATS score changes never move or reject an application automatically.
