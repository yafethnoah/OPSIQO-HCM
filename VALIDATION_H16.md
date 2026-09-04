# OPSIQO V7.32 H16 Validation

## Trigger
H15 Windows certification failed at Semantic TypeScript with TS7016 because the TypeScript H14 watchdog test imported the runtime `.mjs` helper directly without a declaration surface.

## Repair validation
- H16 audit: 9/9 PASS.
- H11 historical hardening audit: 22/22 PASS.
- H14 isolated-browser watchdog audit: 15/15 PASS.
- H15 historical compatibility audit: 8/8 PASS.
- V7.32 source audit: 101/101 PASS.
- Watchdog self-test: PASS; a deliberately non-terminating child process is killed by the real bounded-process helper.
- Translation inventory: 3528/3528 reviewed; 0 backlog.
- Frozen source manifest: regenerated and verified after the repair.
- Strict clean-release audit: PASS.

## TypeScript boundary
The exact TS7016 source condition is removed: no TypeScript file imports `scripts/opsiqo85-v7-32-bounded-process.mjs` directly. The watchdog proof is executed through a dedicated Node `.mjs` self-test subprocess. A fresh dependency-backed `tsc --noEmit` could not be completed in the packaging environment because `npm ci` did not finish there; the Windows certification runner remains the authoritative dependency-backed TypeScript gate.
