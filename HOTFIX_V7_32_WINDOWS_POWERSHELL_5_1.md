# OPSIQO ONE V7.32 - Windows PowerShell 5.1 Certification Hotfix

## Issue fixed

The V7.32 validation runner was UTF-8 without a BOM and contained Unicode em-dash characters in three console headings. Windows PowerShell 5.1 can decode BOM-less UTF-8 using the active ANSI code page. The UTF-8 byte sequence for an em dash can therefore be mis-decoded into characters that include a smart double quote, corrupting the PowerShell tokenizer and producing a misleading unterminated-string error near the authenticated accessibility block.

Observed symptom:

- `The string is missing the terminator: ".`
- `Missing closing '}' in statement block or type definition.`

The reported line around the authenticated accessibility UAT was not the actual logic defect; the parser had already been corrupted by an earlier mis-decoded Unicode heading.

## Remediation

- Converted the V7.32 certification runner to ASCII-safe PowerShell source.
- Converted historical root validation PowerShell runners with the same em-dash hazard to ASCII-safe source.
- Preserved the existing UTF-8 BOM legacy UAT script; BOM-marked UTF-8 is safe for Windows PowerShell 5.1.
- Added `scripts/opsiqo85-v7-32-windows-powershell-compat-audit.mjs`.
- The audit fails when a BOM-less `.ps1` contains non-ASCII bytes.
- On Windows it additionally invokes the native `System.Management.Automation.Language.Parser` against every `.ps1` before dependency installation.
- Added the compatibility audit to the beginning of `RUN_OPSIQO_ONE_V7_32_VALIDATION.ps1`.

## Safety

This hotfix changes certification/validation scripts only. It does not change OPSIQO HR business logic, AI authority, tenant controls, Firestore production data, Firebase production configuration, or deployment behavior.
