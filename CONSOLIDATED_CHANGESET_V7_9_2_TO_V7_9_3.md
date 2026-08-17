# OPSIQO HCM 8.5 — Consolidated V7.9.2 → V7.9.3 Changeset

## V7.9.2 certification/security repair

- Preserve manager team-scoped ATS operation while retaining requisition scope enforcement.
- Tighten direct employment-record Firestore reads to HR or the owning worker.
- Make workflow definitions, workflow runs and workflow step runs server-owned.
- Replace long-lived Firebase production CI credentials with GitHub OIDC, Google Workload Identity Federation and ADC.
- Fail closed on arbitrary production branch/ref execution.
- Verify the frozen source manifest before production dependency installation.
- Separate actual source commit provenance from Cloud Run `K_REVISION`.
- Remove misleading/fabricated build-commit presentation.
- Split code certification from production-environment certification.
- Add the default-branch scheduler synchronization helper and production scheduler documentation.
- Require explicit Firebase App Hosting framework-compatibility evidence for Next.js 16 production certification.

## V7.9.3 UX and functional closure

- Make `/home` the default application entry point.
- Reorganize the sidebar into Start, People, Talent & Work, Insights, More, and Admin & Platform.
- Collapse More and Admin & Platform by default.
- Add permission-aware page/task/module search.
- Preserve the V7.8/V7.9 Employee Portal as a direct `/employee` navigation destination.
- Add active-route `aria-current`, skip-to-main navigation, and a focusable main landmark.
- Add navigation route-integrity, literal API wiring and dead-control audits.
- Add a controlled end-to-end UAT matrix covering employee, manager, HR, admin, mobile and permission-isolation journeys.

No governed HCM domain service is intentionally bypassed by these changes. Production evidence remains a separate external gate.
