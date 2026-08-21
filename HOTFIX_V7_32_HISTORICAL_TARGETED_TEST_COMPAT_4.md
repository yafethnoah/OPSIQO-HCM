# OPSIQO ONE V7.32 Historical Targeted Test Compatibility Hotfix 4

## Purpose

This hotfix repairs a certification-only regression-harness defect discovered by the Windows dependency-backed V7.32 certification run.

The active runtime correctly uses `legacy-surface-translations-v7-32.json`. The V7.31 targeted Vitest still required the active runtime file to contain the older literal `legacy-surface-translations-v7-31.json`, so it failed even though the V7.31 audit and the V7.32 runtime behavior were correct.

A proactive scan found the same stale assertion in the V7.30 targeted test.

## Repairs

- `tests/opsiqo85/opsiqo-one-v7-31.test.ts`
  - now verifies that the active legacy translation catalog version is V7.31 **or later**.
- `tests/opsiqo85/opsiqo-one-v7-30.test.ts`
  - now verifies that the active legacy translation catalog version is V7.30 **or later**.
- `scripts/opsiqo85-opsiqo-one-v7-32-audit.mjs`
  - now guards both historical targeted-test contracts so future releases cannot silently reintroduce exact-old-version assertions.

## Safety boundary

No application runtime behavior, HCM business logic, AI action authority, permissions, tenant boundaries, Firestore rules, translation content, or production deployment behavior was changed.

Safe Execute remains limited to the existing low-risk notification-read action.

## Windows evidence that triggered this repair

The authoritative Windows run reached and passed:

- PowerShell 5.1 compatibility
- machine preflight
- frozen source verification
- local `.env.local` overlay clean-release gate
- locked dependency installation
- locked toolchain post-install preflight
- V7.32 source audit
- V7.32 translation verification
- Semantic TypeScript (`tsc --noEmit`)
- V7.32 targeted tests (8/8)

The first failure was V7.31 targeted tests, where 4/5 tests passed and only the stale literal catalog assertion failed.

## Next gate

Run the full V7.32 certification again. V7.31 and V7.30 targeted translation-version assertions should now accept the active V7.32 catalog and certification should continue to later test, Rules, build and browser/UAT gates.
