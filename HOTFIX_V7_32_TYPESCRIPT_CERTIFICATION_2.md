# OPSIQO ONE V7.32 - TypeScript Certification Hotfix 2

Date: 2026-08-20
Overall project progress: 99.99%

## Why this hotfix exists

The corrected Windows PowerShell 5.1 certification runner successfully passed preflight, installed the locked toolchain, and completed all source/regression audits before reaching Semantic TypeScript. The Windows run then exposed 12 real TypeScript errors across five files. The same run also showed that the sanitized certification ledger could not be parsed by the Node summary process on Windows PowerShell 5.1.

## Source repairs

1. `src/components/compliance-radar-workspace.tsx`
   - Added the missing React `useRef` import.
   - Added the missing `useLegacySurfaceTranslation` import.

2. `src/lib/opsiqo-one/notification-intelligence.ts`
   - Added explicit `NotificationDigestGroup['priority']` typing.
   - Added a total typed `PRIORITY_RANK` map for sorting.
   - Preserved unread grouping, three-item samples, six-group maximum, and permission scope.

3. `src/lib/opsiqo-one/organization-launchpad.ts`
   - Added the required `notificationDigest` value to preview suggestions.

4. `src/lib/opsiqo-one/policy-intelligence.ts`
   - Removed the duplicate block-scoped `v` binding by using `currentVersion`.
   - Explicitly typed the workflow collection as `WorkflowDefinition[]` so callback parameters no longer degrade to implicit `any`.

5. `tests/opsiqo85/integration-production-uat-v7-23.test.ts`
   - Changed the intentional fixture bridge to `as unknown as IntegrationDashboard`, avoiding the readonly tuple incompatibility while keeping the production type unchanged.

## Certification tooling repairs

- `RUN_OPSIQO_ONE_V7_32_VALIDATION.ps1` now writes the JSON ledger as UTF-8 without BOM using `System.IO.File.WriteAllText` and `UTF8Encoding(false)`.
- `scripts/opsiqo85-v7-32-certification-summary.mjs` defensively strips a UTF-8 BOM before JSON parsing.
- Semantic TypeScript now runs immediately after the V7.32 current-release audit and translation verification, before the historical regression chain. This makes compiler failures fail fast.
- V7.15 historical notification checks were made whitespace-tolerant so the formatting cleanup does not masquerade as a behavioral regression.

## Validation performed in packaging environment

- V7.32 source audit: PASS (71/71 after hotfix assertions)
- Windows PowerShell compatibility source audit: PASS
- Translation inventory verification: PASS
- V7.31 -> V7.10 source regressions: PASS after formatting-compatible V7.15 assertions
- MFA / UX / HCM / ATS / ESS / Automation source audits: PASS
- TS/TSX syntax parse: 1,062 files / 0 parse errors
- JS/MJS/CJS syntax: 120 files / 0 errors
- JSON parse: 88 files / 0 errors
- BOM-prefixed ledger simulation: PASS; summary identifies the first failing gate correctly

## Certification boundary

The packaging environment could not complete locked `npm ci` because registry requests failed with `EAI_AGAIN`, so this package does not claim a packaging-environment semantic TypeScript pass. The authoritative next proof is the included Windows runner, where locked dependency installation already succeeded in the user's previous run.

No production Firebase/App Hosting deployment is performed by the runner.
