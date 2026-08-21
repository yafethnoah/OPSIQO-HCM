# OPSIQO ONE V7.32 - Consequential Router Hardening Hotfix 7

Date: 2026-08-20
Overall OPSIQO progress: 99.99%

## Trigger
Windows dependency-backed certification reached the V7.13 targeted suite after Semantic TypeScript and every V7.32->V7.14 targeted suite passed. V7.13 exposed a genuine command-router safety gap: `Build an agent that terminates Ahmed now` routed to Agent Builder as `prepare` instead of being blocked as a consequential employment action.

## Root cause
The separation firewall matched only the exact base forms `terminate`, `fire`, and `dismiss`. Common active inflections such as `terminates`, `terminating`, `fires`, `firing`, `dismisses`, and `dismissing` could bypass the consequential check and then match a lower-priority normal route.

## Production fix
`src/lib/opsiqo-one/command-router.ts` now uses action-form-aware matching:

- terminate / terminates / terminating
- fire / fires / firing
- dismiss / dismisses / dismissing

The consequential firewall remains before all normal routing patterns.

Past-tense descriptive forms such as `terminated employee`, `fired employee`, and `dismissed employee` are intentionally not blanket-blocked so ordinary historical/document review is not falsely treated as an execution request.

## Regression hardening
- V7.13 executable test now covers multiple inflected separation commands and benign historical-review examples.
- V7.32 targeted test checks that the hardened separation pattern remains present.
- V7.32 source audit guards the production regex and V7.13 regression coverage.
- V7.10 and V7.11 historical audits were made forward-compatible with the hardened regex without weakening their termination-block requirement.

## Safety boundary
This hotfix does not expand AI authority. Safe Execute remains exactly `notifications.mark_visible_read`. Custom agents remain capped at Prepare. Consequential employment decisions remain blocked in the command layer and require the governed human workflow.

No production deployment command was added.
