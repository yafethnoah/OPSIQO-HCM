# OPSIQO ONE V7.32 - Safe Execute Targeted-Test Compatibility Hotfix 6

Date: 2026-08-20

## Trigger

Windows dependency-backed certification reached the V7.17 targeted suite after Semantic TypeScript and all V7.32 through V7.18 targeted suites passed. V7.17 then failed because the test asserted that `executionReadinessDashboard().boundary` must literally contain `does not expand`.

The current V7.32 source still preserves the same safety state, but the explanatory boundary text was later rewritten to state that V7.19 preserves the single V7.16 notification Execute action and keeps candidate locale/appearance actions on hold.

## Real fix

`tests/opsiqo85/opsiqo-one-v7-17.test.ts` now verifies the invariant structurally instead of depending on historical prose:

- `SAFE_EXECUTION_ALLOWLIST` contains exactly one action.
- the sole action id is `notifications.mark_visible_read`.
- `executionReadinessDashboard().enabledActions` exactly matches the Safe Execute allowlist ids.
- candidate actions remain present.
- every candidate remains `hold_for_uat`.

No Safe Execute authority was added or changed.

## Guardrail

The V7.32 source audit now checks that the V7.17 executable test validates structural allowlist identity and candidate UAT hold status, and no longer requires the obsolete `does not expand` wording.

## Scope boundary

This hotfix changes only historical certification-test compatibility and its audit guard. It does not change HCM behavior, AI authority, tenant isolation, employment-decision safeguards, Firestore rules, workflow activation, connector execution, or deployment behavior.
