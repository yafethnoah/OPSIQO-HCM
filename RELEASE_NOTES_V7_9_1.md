# OPSIQO HCM 8.5 V7.9.1 — Stabilization Release

This release stabilizes V7.9 before production certification.

## Fixed in V7.9.1
- Performance workspace UTF-8 corruption.
- Privacy-minimized `workerDirectory` projection; raw worker/assignment Firestore reads are no longer organization-wide to employees.
- Content Security Policy and Cross-Origin-Resource-Policy headers.
- Team-scoped manager permissions for recruiting, onboarding, time, PIP and learning verification.
- CI triggers now cover `production-*` branches.
- Production CI receives the complete Firebase Web configuration contract.
- Source-controlled `apphosting.yaml` with Secret Manager references and ADC.
- Hourly governed production automation scheduler workflow.
- Explicit product-release / certification-baseline / commit identity.

## First local certification command
Run `RUN_VALIDATION.cmd` or `RUN_OPSIQO_8_5_V7_9_1_STABILIZATION_VALIDATION.ps1`.

## External production controls still required
Branch protection, real Secret Manager values/access grants, App Hosting nodejs22 + ABIU confirmation, App Check enforcement, MFA, monitoring, PITR/restore evidence, successful CI, controlled rollout, and authenticated production UAT.
