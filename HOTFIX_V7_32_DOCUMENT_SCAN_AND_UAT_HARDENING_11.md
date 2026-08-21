# OPSIQO HCM 8.5 V7.32 — Document Scan & UAT Hardening Hotfix 11

This maintenance hotfix preserves the V7.32 product/version boundary while closing concrete production-governance and certification-observability gaps found during the full-project audit.

## Application fixes

- Prehire document downloads now fail closed when a document is quarantined, and in governed production mode they require a clean malware-scan state.
- Employee-document clean status can no longer be recorded as production evidence without an evidence reference when the clean-scan gate is enabled.
- Prehire documents now have governed scan actions with audit lineage (`scanEvidenceRef`, `scanRecordedBy`, `scanRecordedAt`).
- In governed production mode, a candidate document upload remains **in progress / awaiting scan** instead of falsely completing the task before malware verification.
- Only the **latest** upload can complete or reopen its document task; scanning an older superseded upload cannot change current onboarding readiness.
- Quarantining the latest prehire upload reopens the associated candidate document task.
- Employee activation checks the **latest** upload for every required blocking prehire document and refuses activation if the latest file is missing, quarantined, or not clean.
- Evidence promotion rechecks clean scan state/evidence immediately before copying prehire files into the employee document vault, closing the activation-to-promotion race window.
- Compliance and Onboarding workspaces now expose evidence-reference controls, quarantine actions, and verified-only download affordances.

## Release/readiness fixes

- Production base URLs are parsed as credential-free HTTPS origins and server/browser origins must match.
- Firebase Admin service-account mode now requires a structurally valid service-account email/private-key pair; ADC remains supported.
- App Check, automation, survey, and AI credential checks reject placeholder/trivial values rather than accepting presence alone.
- Vitest configuration moved to `vitest.config.mts` to remove the ESM/CommonJS future-loader warning.

## Browser UAT improvements

- Route-by-route progress is printed during the authenticated matrix.
- Each authenticated route receives an explicit HTTP-status check.
- Per-route duration and failure counts are visible.
- Partial evidence is still written if the CDP/browser matrix throws before all routes complete.
- Route timeout and settle timing can be bounded through `OPSIQO_A11Y_ROUTE_TIMEOUT_MS` and `OPSIQO_A11Y_ROUTE_SETTLE_MS` without weakening defaults.

## Safety boundary

No production deployment command was added. Safe Execute remains unchanged. Consequential employment actions remain human-gated. Human accessibility, connector UAT, change approval, and production deployment remain separate attestations.
