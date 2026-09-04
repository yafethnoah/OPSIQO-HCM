# OPSIQO H46 — Smart Time, Attendance & Expense Intelligence

H46 extends the H45B recruiting baseline with frontline workforce operations inspired by specialized attendance products while preserving OPSIQO's privacy, audit, permission and human-governance boundaries.

## Implemented in the web/PWA + server platform

### Smart attendance
- Work locations with latitude/longitude and configurable geofence radius.
- Automatic nearest-work-location matching using geodesic distance.
- Disabled, advisory or enforced geofence modes.
- Time Policy cannot enable geolocation/geofencing without a governed published electronic-monitoring policy.
- Clock evidence can retain coordinates, accuracy, capture time, source, nearest location, distance, in/out-of-geofence state and integrity risk signals.
- Risk signals include stale/low-accuracy capture, outside-geofence evidence, suspicious client integrity signals and impossible-travel heuristics.
- Integrity signals are evidence for review; they are not personality, fraud or employment-decision predictions.
- Optional worksite/policy requirement for device verification. The web clock intentionally reports `none`; enforced verification is reserved for a capable native/kiosk client rather than faking biometric verification in the browser.

### Secure offline clock events
- Narrow offline queue stores attendance events only, not the employee database.
- Payload is encrypted in IndexedDB with a non-exportable AES-256-GCM key.
- Each event has a UUID and original client capture time.
- Server sync is policy-controlled, location-controlled, deduplicated and limited to a 24-hour automatic synchronization window.
- Offline-synced entries retain `offline_sync` source provenance.

### Breaks
- Explicit Start Break / End Break events.
- Unpaid break duration is automatically accumulated on the active time entry.
- Clock-out is blocked until an active break is ended.

### Scheduling and overtime intelligence
- Draft/published/cancelled shift assignments.
- Managers can schedule direct reports; HR can manage broader scope according to permissions.
- Shift overlap protection.
- Approved-leave conflict protection.
- Work-location assignment.
- Coverage summary by date/location.
- Overtime watch calculated per worker and configured week against the worker's Time Policy threshold.
- OPSIQO highlights conflicts and projected overtime but does not autonomously assign or cancel shifts.

### Live attendance
- Permission-scoped current attendance view for open clock entries.
- Map-like coordinate visualization without continuous background tracking.
- Shows working/on-break state, geofence result and location-integrity risk.

### Attendance photo evidence
- Optional JPG/PNG evidence, or policy/worksite-required proof.
- File type/signature and size validation.
- Private storage and governed audit trail.
- Recent photo is consumed by the next clock event within ten minutes.
- No face recognition, emotion analysis, personality inference or automated employment decisioning.

### Expense & reimbursement
- Dedicated permissions for read/request/approve/manage.
- Draft expense claim with merchant, category, currency, amount, tax, purpose, project and cost centre.
- Up to five PDF/JPG/PNG receipts, 10 MB each.
- Magic-byte validation and SHA-256 duplicate-receipt protection.
- Governed states: draft → submitted → manager approved → finance approved → paid.
- Self-approval is blocked and finance approval must be independent of the creator/manager approver.
- Rejections require a reason.
- In-app notifications/domain events support approval workflow.
- Permissioned, audited CSV export for finance/accounting integration.

## Existing capabilities preserved
- Leave requests/balances/approval.
- Timesheets and manager approval.
- Time-policy compliance and exceptions.
- Payroll CSV export.
- H45B recruiting, parsing, ATS and structured interview intelligence.

## Explicit boundary — not falsely claimed by H46
H46 does **not** claim that OPSIQO now has a shipped native iOS/Android app or completed biometric/WebAuthn ceremony. The domain/API can require `platform_authenticator`, `native_biometric` or `kiosk_pin` evidence from a capable client, but a native mobile/kiosk client remains a separate deliverable. H46 also does not continuously GPS-track employees outside clock events.

## Release identity
- Product release: `8.5-v7.32-H46`
- Feature release: `H46`
- Patch release: `H46`
