# Validation Report - OPSIQO ONE V7.32 Safe Execute Targeted-Test Compatibility Hotfix 6

Date: 2026-08-20

## Windows evidence received

The prior Windows certification proved:

- Windows PowerShell 5.1 compatibility PASS.
- machine preflight PASS.
- frozen source verification PASS.
- certification-local `.env.local` overlay handling PASS.
- locked `npm ci` completed successfully.
- locked toolchain preflight PASS.
- V7.32 source audit PASS.
- V7.32 translation verification PASS with 3,521 / 3,521 reviewed and 0 remaining.
- Semantic TypeScript PASS.
- targeted suites V7.32 through V7.18 PASS.
- first failing gate: V7.17 targeted tests.

The failing V7.17 assertion was prose-sensitive: it expected the current execution-readiness boundary to contain the exact phrase `does not expand`, although the runtime safety state still preserved a single notification Execute action and held all candidate actions for UAT.

## Hotfix 6 source validation

- V7.32 source audit: 89 / 89 PASS.
- V7.17 source audit: 90 / 90 PASS.
- V7.16 through V7.10 source audits: PASS.
- MFA / UX / ESS / Automation / HCM completion / ATS-import source audits: PASS.
- TS/TSX parse sweep: 1,114 files, 0 parse errors.
- JS/MJS/CJS syntax sweep: 121 files, 0 errors.
- JSON parse sweep: 86 files, 0 errors.
- YAML parse sweep: 10 files, 0 errors.

## Dependency-backed executable boundary

The packaging environment could not complete a fresh `npm ci` within its execution window, so this report does not claim local Vitest execution for Hotfix 6. The next Windows certification run is authoritative for the modified V7.17 targeted test and all subsequent executable/build/browser gates.

## Safety result

The complete Safe Execute allowlist remains exactly:

`notifications.mark_visible_read`

No second Execute action was introduced.
