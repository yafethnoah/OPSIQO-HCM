# OPSIQO ONE V7.32 - Local Environment Certification Hotfix 3

Date: 2026-08-20

## Trigger

Windows certification stopped at `Clean release audit before install` because the local extracted workspace contained a root `.env.local` file. The frozen source manifest had already passed because local environment files are deliberately excluded from the source manifest, but the strict release-cleanliness audit correctly rejected `.env.local` as a release artifact.

## Repair

V7.32 Hotfix 3 preserves the strict release boundary while supporting a developer/operator local runtime environment file during certification.

- `scripts/opsiqo-clean-release-audit.mjs` remains strict by default.
- Strict/package mode still rejects `.env.local`.
- A new explicit `--certification-local-env-overlay` mode permits only the root `.env.local` file.
- The Windows V7.32 certification runner uses that mode for the pre-install clean-release gate.
- The source manifest continues to exclude local environment files.
- `.env`, nested `.env.*` files, credential artifacts, generated build directories, logs and transient files remain blocked.
- The clean-release gate never reads, copies, hashes or prints `.env.local` contents.
- The local `.env.local` remains available to later Next.js/Firebase certification stages if the application needs local runtime configuration.

## Additional fail-fast checks

The V7.32 machine preflight now verifies:

- the clean-release script contains the certification-only local overlay policy;
- the runner actually invokes that policy;
- root `.env` remains prohibited;
- root `.env.local`, when present, is reported only by filename as a local runtime overlay.

## Security boundary

This is not a general environment-file exception. Only root `.env.local` is allowed during local certification. No secret values are intentionally emitted into the console or certification ledger.

## Product boundary

No HCM domain behavior, Firebase production deployment logic, AI Execute authority, tenant isolation, MFA, ATS, HR workflows, employee records or production connector behavior changed in this hotfix.
