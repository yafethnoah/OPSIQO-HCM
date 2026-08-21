# OPSIQO V7.32 H16

## Trigger
Windows certification of H15 stopped at Semantic TypeScript with TS7016 because a TypeScript watchdog test imported `scripts/opsiqo85-v7-32-bounded-process.mjs` directly and that runtime JavaScript module had no TypeScript declaration surface.

## Repair
- Removed the direct TypeScript import of the runtime `.mjs` watchdog helper.
- Added `scripts/opsiqo85-v7-32-watchdog-selftest.mjs`, which exercises the real `runBoundedProcess` implementation against a child process that never exits.
- The Vitest watchdog test now invokes that self-test as a bounded subprocess and requires an explicit PASS result.
- Added H16 audit and targeted-test gates to the canonical Windows certification runner.

## Safety
This does not weaken the H14 anti-freeze controls. The same production browser coordinator still uses isolated per-route workers, OS-level route deadlines, process-tree termination and checkpoint evidence.
