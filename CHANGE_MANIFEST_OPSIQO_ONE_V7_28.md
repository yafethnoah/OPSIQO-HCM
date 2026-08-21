# OPSIQO ONE V7.28 Change Manifest

## Multilingual closure

- Added `legacy-surface-translations-v7-28.json`.
- Added reviewed EN/FR/ES/AR coverage for Import Center, Intelligence Hub, AI Governance and Agent Builder.
- Wired all four surfaces to the existing locale observer using `useLegacySurfaceTranslation`.
- Added V7.28 translation inventory generation/verification.
- Improved inventory filtering for obvious identifier-like source-code fragments.
- Result: 44 surfaces, 2,666 explicit entries, 2,650 reviewed source candidates, 904 measured candidates remaining.

## Accessibility/UAT

- Added V7.28 authenticated browser smoke.
- Added `/import-center`, `/intelligence`, `/agent-builder` and reviewed AI Governance Arabic evidence to the matrix.
- Moved local certification browser ports to 31732/31733.

## Certification reliability

- Corrected certification ledger metadata from stale V7.26 to V7.28.
- Corrected stale local-certification banner to V7.28.
- Added V7.28 preflight, first-failure summary and one-command runner.
- Added deployment-readiness reporting that separates source/dependency/browser/manual-accessibility/connector/deployment states.
- No production deployment command is included.

## Regression preservation

- Preserved V7.27→V7.10 OPSIQO ONE contracts.
- Preserved MFA, UX closure, Enterprise Self Service, Automation, HCM completion and ATS/import audits.
- Historical version assertions were made forward-compatible only where V7.28 changes the product badge/catalog/snapshot lineage.

## AI governance

- Safe Execute allowlist unchanged: `notifications.mark_visible_read` only.
- No Cortex agent promoted to unrestricted Execute.
- Consequential-action firewall remains first.
