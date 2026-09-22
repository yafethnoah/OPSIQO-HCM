# OPSIQO H51.75 — Leave Reconciliation + Push Readiness Closure

Parent: H51.74 `ea1fc10926f182b53e2ae61885a22ad3afbc5f99`

## Recording-driven findings closed
- Detects legacy duplicate leave configurations that produced repeated Sick Leave balance cards.
- Adds governed **Reconcile safe duplicates** for active, unreconciled exact-code duplicates.
- Reconciliation moves leave-request references to a canonical leave type, disables aliases, preserves audit evidence, and refuses automatic reconciliation when an alias has non-zero opening/adjustment balance.
- Disabled reconciled aliases remain in history but are removed from the active leave-balance card display.
- Makes **Configure Ontario legal leaves** visible beside the operational employee leave selector when governed Ontario statutory templates are still missing.
- Prevents the quick-create **Close** button from wrapping vertically.
- Clarifies attendance reminder counts: scope matched, approved-leave exclusions, eligible targets, in-app reminders, push-ready devices and provider acceptance are separate facts.
- Preserves H51.74 statutory leave intelligence, H51.73 server-push repair/test and H51.72 exact local alarms.

## Native push boundary
The web application can diagnose missing push-ready registrations, but a real staff push notification still requires a fresh OPSIQO Pulse native build installed on the device, notification permission, native registration and the server self-test. H51.75 does not claim a web-only patch can manufacture a native push token.
