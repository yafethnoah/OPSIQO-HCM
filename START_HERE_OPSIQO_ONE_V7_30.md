# OPSIQO ONE V7.30 — Start Here

**Release:** OPSIQO HCM 8.5 V7.30 — Final Source Closure & Validated Production Sign-off  
**Overall roadmap/source progress:** 99.9%  
**Source phase:** complete  
**Production deployment:** not performed by this release package

## What V7.30 closes

- Extends reviewed EN/FR/ES/AR coverage to the highest remaining operational gaps: Performance completion controls, Organization Design, ATS Resume/Cover Letter Studio, Organization administration, Program Workforce, Invitations, Compensation safeguards, Employee Experience safeguards, governed Gantt, and Strategy.
- Uses the V7.30 translation catalog and keeps conflict-safe exact global translation reuse.
- Adds strict human sign-off schema validation before manual accessibility, connector UAT, release/change approval, or deployment approval can contribute to production readiness.
- Approved human sign-offs require reviewer, ISO timestamp, and at least one evidence reference. Release/deployment approvals also require their governed reference IDs.
- Rejects secret-like sign-off field names and common private-key/token patterns.
- Keeps Safe Execute frozen at `notifications.mark_visible_read`.
- Keeps consequential employment actions behind the existing human-governed firewall.

## Windows certification

Run from a short clean Windows path such as `D:\opsiqo\v730`:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_ONE_V7_30_VALIDATION.ps1
```

The runner performs no Firebase/App Hosting production deployment and does not intentionally print secret values.

## Human sign-off

Copy `PRODUCTION_SIGNOFF_TEMPLATE_V7_30.json` to:

`artifacts\v7-30-human-signoff.json`

Complete only non-sensitive reviewer/evidence references. The validator will reject invalid approval records and secret-like fields/patterns.

## Truth boundary

V7.30 is a source-closure release. Overall project progress remains below 100% until dependency-backed certification, browser UAT, manual accessibility approval, connector UAT approval, release/change approval, and controlled production deployment evidence are actually complete.
