# OPSIQO HCM 8.5 Local Runtime V4

## Runtime defect fixed

The V3 browser trace proved that the active V3 server was running, all emulator ports were live, and Firebase Auth still failed at `getAuth(firebaseClientApp())`. The immediate cause was reuse of `getApps()[0]`, which can point at a stale/default Firebase app surviving Next.js Fast Refresh or another Firebase consumer. Auth validates the app options before `connectAuthEmulator()` can run, so a stale app with a missing/invalid API key fails first.

V4 isolates the OPSIQO browser Firebase app by deterministic name (`opsiqo-local-<projectId>` or `opsiqo-cloud-<projectId>`), looks up only that named app, and updates Remote Config / Analytics to consume the same authoritative app. This prevents unrelated/default Firebase app state from contaminating Auth.
