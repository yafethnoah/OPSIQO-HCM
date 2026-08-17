# OPSIQO HCM 8.5 V7.9.3.1 — Code Certification Readiness Hotfix

Date: 2026-08-17

## Purpose

This hotfix corrects a test-fixture drift introduced when the V7.9.2 production-readiness model added two fail-closed deployment controls:

- `OPSIQO_DEPLOYMENT_PLATFORM=firebase_app_hosting`
- `OPSIQO_APP_HOSTING_FRAMEWORK_EVIDENCE_REF=<controlled evidence reference>`

The production-readiness implementation correctly required both controls, but `tests/production-readiness.test.ts` did not add them to its `setProductionBaseline()` fixture. As a result, the test named `passes a complete production configuration without exposing secret values` constructed an incomplete production baseline and incorrectly expected `summary.ok === true`.

## Repair

- Added the approved deployment platform to the complete production test baseline.
- Added a non-secret controlled App Hosting compatibility evidence reference to the baseline.
- Added regression coverage proving fail-closed behavior for an unsupported deployment platform.
- Added regression coverage proving fail-closed behavior when App Hosting compatibility evidence is absent.

## Security posture

No production readiness check was weakened, bypassed, mocked out, or removed. The application continues to fail closed when deployment-platform or App Hosting evidence requirements are not met. This is a test-fixture repair only.

## Certification expectation

The previously observed code-certification run passed frozen-source integrity, clean-release pre-install, deterministic dependency installation, and TypeScript, then reached Full Vitest with 318/319 tests passing. After this fixture repair, rerun `RUN_CODE_CERTIFICATION.cmd` from a clean workspace. Production certification remains a separate gate.

## Certification-runner usability improvement

The code-certification runner now injects deterministic non-production Firebase Web build values into its own PowerShell process. This removes the need for developers to create or retain `.env.local` merely to compile the client bundle during code certification. The clean-release gate still rejects local environment files in the certified source tree, and production credentials/evidence are still required only by the separate production-certification runner.
