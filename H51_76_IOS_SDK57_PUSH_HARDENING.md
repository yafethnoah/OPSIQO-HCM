# OPSIQO H51.76 — iOS SDK57 + Push Delivery Hardening

Parent H51.75: `cb8fe4df642a96a50058d2bdd32500178195c3ec`

## Scope
- Aligns the Expo SDK 57 packages that blocked the fresh iOS build.
- Preserves OPSIQO Pulse version lineage.
- Preserves H51.72 local iOS Time Sensitive attendance alarms.
- Adds iOS `time-sensitive` interruption level to:
  - employee server self-test;
  - administrator Clock In / Clock Out broadcasts;
  - scheduled server backup reminders.
- Preserves push-token registration and `Repair & test server notifications`.

## V3 continuation
V1 and V2 both stopped fail-closed before touching the admin attendance push.
V2 proved the partial branch contained only:
- `mobile/package.json`
- `src/lib/mobile/service.ts`

The V2 matcher still used LF-only exact source text. The Windows working copy uses
CRLF on these files, so V3 normalizes line endings in memory and uses a bounded
semantic matcher tied to the push payload `source` discriminator.

Production remains untouched.


## Mobile dependency isolation
- Removes the accidental local web-app dependency `opsiqo-hcm-v3-production-evidence@"file:.."` from the Pulse package/lock graph.
- Prevents the web React 19.2.8 tree from being installed inside the Expo SDK 57 mobile application.
- Keeps Pulse on the Expo-compatible React / React DOM 19.2.3 graph.
- Expo Doctor remains a fail-closed release gate; no duplicate-dependency warning is suppressed.
