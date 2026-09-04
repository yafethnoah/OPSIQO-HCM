# OPSIQO ONE V7.32 - Windows PowerShell 5.1 Hotfix Validation

## User-observed failure

Windows PowerShell 5.1 rejected `RUN_OPSIQO_ONE_V7_32_VALIDATION.ps1` before any certification gate ran:

- `The string is missing the terminator: ".`
- `Missing closing '}' in statement block or type definition.`

## Root cause

The script was BOM-less UTF-8 and contained Unicode em-dash characters. Windows PowerShell 5.1 may interpret BOM-less UTF-8 using the system ANSI code page. The em-dash byte sequence can be mis-decoded into a smart quote, which PowerShell accepts as a string delimiter and which corrupts the token stream.

## Fix

- V7.32 primary certification runner is ASCII-only.
- Historical validation runners containing the same em-dash hazard are ASCII-safe.
- BOM-marked legacy PowerShell is retained because the BOM makes its encoding explicit.
- A new dependency-free compatibility audit rejects BOM-less non-ASCII `.ps1` files.
- On Windows the audit calls the native PowerShell parser against all `.ps1` files before `npm ci`.

## Scope boundary

No HCM domain logic, AI policy, permissions, tenant behavior, Firebase production configuration, or deployment path was changed.

## Packaging validation

- Windows PowerShell 5.1 encoding audit: PASS across 38 `.ps1` files.
- Current V7.32 certification runner: ASCII-only.
- V7.32 source audit: 60/60 PASS.
- V7.31 through V7.10 source regression lineage: PASS.
- MFA source audit: 23/23 PASS.
- Translation snapshot: 3,521/3,521 reviewed; 0 remaining.
- TypeScript/TSX parser: 1,114 files / 0 parse errors.
- JS/MJS/CJS syntax: 121 files / 0 errors.
- JSON parsing: 85 files / 0 errors.
- YAML parsing: 10 files / 0 errors.
- Clean-release audit: PASS / 0 findings.
- Native Windows PowerShell parser cannot be executed in the Linux packaging runtime; the new compatibility gate will execute it on the user's Windows machine before dependency installation.
