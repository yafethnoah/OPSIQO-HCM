# OPSIQO HCM 8.5 V7.3 — Windows-safe Firestore Rules runner

## Failure reproduced from Windows validation

V7.2 successfully selected an isolated Firestore port (8180) but Firebase CLI exited with:

`Error: Too many arguments. Run firebase help emulators:exec for usage instructions`

## Root cause

The V7.2 runner spawned `firebase.cmd` with `shell: true`. On Windows, the shell reparsed the final `emulators:exec` script argument (`vitest run tests/firestore.rules.test.ts`) into multiple positional arguments. Firebase CLI accepts a single script positional argument, so it rejected the command before the emulator/test execution stage.

## V7.3 repair

The runner now invokes the installed Firebase CLI JavaScript entry point directly with the current Node executable:

- `process.execPath`
- `node_modules/firebase-tools/lib/bin/firebase.js`
- `shell: false`
- the complete Vitest command preserved as one array element

The isolated 8180–8189 port pool and protection of the live development Firestore emulator on 8080 remain unchanged.
