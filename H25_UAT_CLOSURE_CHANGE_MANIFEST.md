# OPSIQO V7.32 H25 UAT Closure

Base release: `627033e23efcdafeae039250b1762c7876085f9c`

## Scope

H25 closes runtime gaps observed in live UAT after H24 certification:

1. **Multilingual runtime completeness for confirmed/primary UAT surfaces**
   - Adds an explicit FR/ES/AR runtime UI translation dictionary for strings that were not captured by the legacy JSX-text inventory.
   - Supports dynamic placeholder templates.
   - Wires runtime resolution into both legacy surface translation and global reviewed translation.
   - Adds UAT-only residual-English diagnostics so missed visible strings are surfaced rather than silently accepted.

2. **Authenticated-shell recovery**
   - Protected routes redirect unauthenticated users to `/signin` with a governed return target instead of rendering misleading organization-setup states.
   - Session-expiry and missing-auth redirects coordinate through a session-scoped flag.

3. **Automatic employee numbering through bulk import**
   - Employee number becomes optional in employee roster imports.
   - Blank numbers are assigned by the existing Core HR tenant-scoped server allocator.
   - Explicit imported numbers remain supported and duplicate-validated.
   - File selection uses an application-controlled, translatable picker instead of the browser-native English file-button label.

4. **Numbering and dropdown governance regression protection**
   - H25 audit verifies H24 employee-number generation and People/Recruiting/Onboarding applicability logic remain present.
   - Audit verifies known system-managed identifiers continue to be generated server-side.

## Release boundary

H25 does not perform production deployment and does not weaken human approval, accessibility, connector, security, or production-governance gates. Full V7.32 certification and UAT acceptance remain required after the patch is applied.
- Work email is optional for Core HR employee creation and employee imports; malformed supplied emails remain blocked.
- Empty work-email values never create a shared/blank workEmailIndex entry.
- Email-dependent identity/career features fail with explicit guidance when an employee has no usable email.
- Employee-import validation messages render separately so runtime localization can translate each message.
- `src/lib/opsiqo-one/legacy-surface-translations-v7-32.json` includes the final H25 file-picker translation coverage.
- Historical V7.29 translation-precedence audit accepts the stronger H25 resolver order: surface-local -> runtime template -> conflict-safe global reuse.
- Historical V7.29 product-badge assertion uses an ASCII-safe Unicode escape for the middle dot to prevent Windows PowerShell 5.1 mojibake.
