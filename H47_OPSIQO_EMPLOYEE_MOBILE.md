# OPSIQO H47 — Employee Mobile Experience

H47 introduces a native mobile client for the existing OPSIQO employee portal. It does not create a second HR database. The iOS/Android app authenticates with Firebase, sends bearer credentials and organization context to the governed OPSIQO API, and all authoritative HR writes continue through server domain services.

## Phase 1 mobile capabilities
- Secure sign-in and secure native session storage.
- Organization selection for multi-organization users.
- Employee home dashboard and attention items.
- Upcoming shifts and live personal clock state.
- Clock in/out using event-time GPS only.
- Optional local Face ID / Touch ID / Android biometric verification for attendance actions; no biometric template is sent to OPSIQO.
- Start/end break.
- Leave request submission and balance visibility.
- Expense reimbursement with receipt photo/file attachment and governed submission workflow.
- In-app notification inbox and read state.
- User-initiated mobile push registration.
- Employee profile and organization switcher.

## Privacy and governance boundaries
- No continuous employee location tracking.
- No direct mobile Firestore writes.
- No employee permission authority in the app; server membership and permissions remain authoritative.
- Installation identifiers are hashed before server persistence.
- Push tokens are treated as sensitive operational metadata and redacted from audit evidence.
- Biometrics are verified by the operating system and only a verification result is sent with the attendance event.
- No autonomous manager approvals, payroll changes, leave approvals, or employment decisions.

## Technology
- Expo SDK 57 / React Native 0.86 / Expo Router.
- iOS bundle: `ca.opsiqo.employee`.
- Android package: `ca.opsiqo.employee`.
- SecureStore for mobile session material.
- Expo Location for user-initiated attendance location.
- Expo LocalAuthentication for device biometrics.
- Expo Notifications for optional push registration.
- Expo ImagePicker for receipt evidence.

## Backend additions
- `GET /api/organizations/{orgId}/mobile/bootstrap`
- `POST /api/organizations/{orgId}/mobile/devices`
- `DELETE /api/organizations/{orgId}/mobile/devices`

Existing H46 time, break, leave, expense and notification endpoints are reused for all consequential transactions.
