# OPSIQO H47.1 — Employee Mobile Essentials Expansion

H47.1 builds on H47 Employee Mobile and keeps the same governed OPSIQO backend as the authoritative source of HR data and actions.

## Added in H47.1
- Native Documents & Pay view using the employee's governed document scope.
- Native Learning & Certificates view with self-scoped learning start actions.
- Native Ask OPSIQO screen connected to the governed AI Copilot; consequential decisions remain blocked.
- Native Safety Reporting for employee-authorized safety incident submission.
- Native manager visibility mode for team size, leave-approval queue counts, submitted timesheets, and direct-report directory.
- Digital employee ID card based on the authenticated OPSIQO profile.
- Secure offline attendance queue using native SecureStore, bounded to 12 events per device.
- Offline clock replay uses H46 `offlineEventId`, `clientCapturedAt`, and `offline_sync` provenance, preserving server geofence, policy, stale-event, and duplicate controls.
- Mobile bootstrap now includes governed employee documents plus team/manager summaries where permitted.

## Security and privacy boundaries
- No mobile direct Firestore writes.
- No continuous GPS tracking.
- Offline attendance is queued only after a user-initiated clock action fails because a server connection is unavailable; server validation still decides whether replay is accepted.
- Device biometrics stay local to the operating system.
- Highly confidential HR-only documents are not included in employee document scope.
- H47.1 intentionally does not bypass clean-document malware-scan controls.
- Manager mobile mode is visibility-only in this increment; it does not silently approve consequential HR actions.
- Safety reporting does not replace emergency services or local emergency procedures.

## Deferred to H47.2
- Authenticated native document file download/share with scan-aware audit evidence.
- Native policy acknowledgement and onboarding/offboarding employee task completion.
- Production Firebase App Check / device-attestation integration.
- Push deep links and interactive notification actions.
- Manager approval actions with explicit review/confirmation gates.
- Benefits/mobile total-rewards detail once a dedicated employee benefits domain is available.
