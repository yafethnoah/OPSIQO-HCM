# OPSIQO 6.1 — Production Certification + Deferred Daily-Experience Closure

6.0.1 should be treated as the hardened product candidate, not as a production certification by itself.

## Gate A — cumulative certification
- apply 6.0.1 to the canonical cumulative workspace;
- pass typecheck, tests, Firestore Rules, build, static scan and source manifest;
- close current dependency/security findings through reviewed non-breaking upgrades or documented risk acceptance;
- complete App Check, privileged MFA/provider allow-list and secret-governance checks;
- complete controlled backup restore and DR exercise;
- produce traceable production evidence bundle and rollback evidence.

## Gate B — contract-intake production closure
- create and independently approve dedicated `CONTRACT_INTAKE_MODEL` and `CONTRACT_INTAKE` records;
- regression-evaluate representative contract formats and layouts;
- establish extraction acceptance thresholds and human-review policy;
- integrate approved malware/DLP scanning for quarantined source contracts;
- define contract retention/legal-hold/deletion policy;
- add governed source-document retrieval after clean-scan evidence;
- add module-specific "Apply reviewed prefill" workflows that invoke authoritative Core HR/compensation services with normal approvals;
- add E2E tests for PDF/DOCX import, employee matching, human edits, duplicate import handling and permission boundaries.

## Gate C — deferred 6.0 experience items
Implement only after the production candidate remains stable:
- push notifications;
- camera/document capture;
- benefits hub;
- employee onboarding/offboarding task home;
- manager leave calendar;
- richer staffing cockpit;
- compensation-cycle action center.

Each item should have an explicit data/privacy boundary and should not be counted as complete until its UAT and security evidence exist.

## Definition of done
**Product hardening complete:** all 6.0.1 cumulative gates pass.

**Contract import production-ready:** dedicated governed AI configuration, scan/DLP, retention, module-application workflow and representative accuracy UAT all pass.

**Production release-ready:** live environment, identity/security, monitoring/SLO, backup/restore, DR, cutover/rollback and release-evidence gates are independently demonstrated.

## Maintenance note — 6.0.3
Before production certification, apply the 6.0.3 Windows PowerShell 5.1-compatible maintenance bundle. It supersedes the 6.0.1 installer only; the production certification gates remain unchanged.
