# OPSIQO HCM 8.5 Complete Implementation — Mandatory UAT

This UAT must be performed on the deployed release candidate with real organization-scoped authentication. A source-code PASS is not a production GO.

## Identity and Settings
- Sign in with password when enabled; verify it is blocked when disabled.
- Register only when `open_auth_only`; verify account creation does **not** grant organization membership.
- Forgot-password follows organization policy.
- Guest access is disabled by default. When explicitly enabled, guest can read only organization/position information and cannot write HR data.
- Verify MFA policy for privileged/all users and session timeout.
- Verify Sign out clears active organization context.
- Verify Light, Dark and System appearance; compact density; large font; reduced motion.

## Employee creation and import
- Select org unit with no available positions: Create stays disabled and a capacity message is shown.
- Create an unassigned employee with both org unit and position empty.
- Create an assigned employee with a valid available position and verify position occupancy increments.
- CSV and XLSX: preview mapping, duplicates, invalid dates, missing columns, position capacity, 500-row limit.
- Commit only a clean server-issued preview; verify audit receipt.
- Force a partial failure and verify `reconciliation_required` rather than blind replay.

## HR library / external resources
- Stage policy, procedure/SOP, contract, form/template and employee document.
- Verify exact duplicate SHA-256 is blocked.
- Verify source cannot download/promote before clean scan evidence.
- Approve/reject review.
- Promote approved/clean DOCX/TXT/RTF/MD policy into a **draft**, never directly published.
- Promote approved/clean employee document and verify controlled document integrity.
- Verify Google Drive and OneDrive/SharePoint show `Not configured` until actual connectors exist.
- Exercise the dedicated Contract Import Studio for contract extraction/review/proposals.

## Invitations
- Create invitation linked to worker and verify email mismatch is blocked.
- Verify email-provider delivery or manual secure-link delivery.
- Copy link, accept with matching signed-in email, verify atomic membership.
- Resend rotates token; old token fails. Revoke invalidates token. Expired token cannot be accepted.

## AI / workflow reliability
- Run AI Copilot and verify truthful stages: validating → interpreting → verifying → complete (or failed/reconciliation). No fake timer and no frozen 0%.
- Run workflow and verify Gantt uses persisted steps, owners, due dates, dependencies, blockers and authoritative progress.
- Disconnect network during a GET and verify bounded retry.
- Interrupt a write after dispatch and verify reconciliation guidance; no automatic duplicate write.

## 8.1–8.4 workspaces
- Orchestrator: service bindings are truthful; unconfigured equipment/payroll capabilities are not shown as complete.
- Operations Cockpit: unavailable/not-permitted sources are N/A/truth states, not fake zeroes.
- Workforce Intelligence: aggregate metrics, lineage/confidence and small-cell suppression; no individual risk scoring.
- Evidence Center: controlled policies/imports/compliance evidence, legal hold and retention behavior.

## Role, tenant, mobile and accessibility
Test Employee, Manager, HR Partner, HR Admin and Org Admin separately. Perform cross-tenant negative tests. Verify mobile layouts, keyboard navigation, visible focus, labels, error association, responsive tables/Gantt alternative, reduced motion and zoom/font scaling.

## Production acceptance
Production GO requires: all code gates green, deployed HTTPS/App Check/identity evidence, backup/PITR + restore proof, monitoring/SLO evidence, authenticated role UAT, rollback evidence, cutover owner and explicit human signoff.
