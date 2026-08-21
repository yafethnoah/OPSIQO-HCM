# OPSIQO HCM 8.5 V7.32 — Hotfix 12

## Production Readiness Secret-Summary Repair

Hotfix 12 fixes the single Windows certification failure observed after Hotfix 11. The production readiness summary did **not** expose the configured Firebase private key; however, its human-readable `firebase_admin` control message contained the literal token `private-key`. The existing secrecy regression intentionally rejects that token anywhere in the serialized readiness response, so the gate failed even though the configuration itself passed.

### Repair

- The public readiness message now describes a `service-account credential pair` rather than naming the secret field.
- Secret values are still read only for validation and are never returned in `ReadinessSummary`.
- The regression now additionally asserts that the exact configured Firebase key, App Check key, automation secret, survey secret, and AI credential are absent from the serialized summary.
- Existing sentinel checks for `test-key` and `private-key` remain in place.
- The canonical Windows certification runner now executes a Hotfix 12 static audit and the production-readiness targeted suite.

### Safety boundary

This repair does not weaken Firebase Admin validation, does not change production credentials, does not print `.env.local`, and does not modify Firebase/App Hosting resources.
