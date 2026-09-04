# OPSIQO HCM 8.5 — V7.6 CLEAN FIXED

This package is a clean consolidation of the latest user-provided V7.1 project plus the production-hardening controls verified on the certification branch.

## Included fixes

- Firestore Rules tests run in an isolated emulator port pool (8180–8189), preserving any development emulator on 8080.
- Production preflight executes with `NODE_ENV=production` through the reviewed local `tsx` CLI with shell parsing disabled.
- Firebase Web configuration can be synchronized from Firebase CLI with project/app consistency checks and API-key redaction.
- Settings prerender, Firestore Rules isolation and production-preflight truth audits are included.
- `npm audit fix --force` release guard is included.
- ATS/import audit evidence is written to `artifacts/audits/` instead of mutating a manifest-protected root JSON file.
- A new immutable certification runner verifies `SOURCE_MANIFEST.sha256` before and after validation and never regenerates it.
- Clean-package audit rejects local environment files, credential artifacts, symlinks and transient build/dependency directories.

## Production boundary

The package does not contain production secrets or `.env.local`. It does not claim production certification merely because source gates pass. App Hosting, Secret Manager, IAM, App Check, privileged MFA, monitoring, backup/PITR, DR restore evidence and authenticated deployed UAT remain external production controls.
