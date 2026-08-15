# OPSIQO HCM 8.5 V7.2 — Firestore Rules Isolation Fix

## Problem
The V7.1 validation gate used the normal development Firestore emulator port 8080. If `npm run dev:local` or another OPSIQO Firebase emulator was already running, the Rules gate failed before executing any Rules tests.

## Fix
`npm run test:rules` now starts a dedicated ephemeral Firestore emulator on the first available port in 8180–8189, with Emulator UI disabled and the dedicated demo project `demo-opsiqo-rules-test`.

The live development emulator on 8080 is never reused, modified, or stopped by this test runner.

## Result
Release validation and local development can run concurrently without a port-8080 collision.
