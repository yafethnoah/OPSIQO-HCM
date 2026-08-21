# Start Here — OPSIQO ONE V7.24

## Overall program status

OPSIQO ONE is approximately **94% complete** against the current roadmap. V7.24 itself is source-complete; the remaining program work is primarily dependency-backed production certification, manual accessibility closure, translation completion, and controlled production UAT/integrations.

## Windows certification

Run from a newly extracted V7.24 folder:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_ONE_V7_24_VALIDATION.ps1
```

The runner does not intentionally print `.env` contents, API keys, tokens, cookies, passwords, or private keys. It does not deploy Firebase or App Hosting.

## New preflight behavior

Before `npm ci`, V7.24 checks the local certification machine for:

- supported Node version (>=22 <24)
- npm
- package-lock and frozen source manifest
- Chrome/Chromium/Edge
- Java for Firebase emulators
- required certification ports
- local disk capacity

After `npm ci`, it verifies the project-locked Firebase CLI, TypeScript, and Vitest executables before continuing.

## V7.24 UAT focus

1. Safety in EN/FR/ES/AR and Arabic RTL.
2. Career & Succession in EN/FR/ES/AR and Arabic RTL.
3. HR Diagnostic in EN/FR/ES/AR and Arabic RTL.
4. Authenticated 320px mobile/accessibility checks for those routes.
5. Full V7.23→V7.10 regression chain.
6. Safe Execute remains limited to the signed-in user's directly targeted unread notifications.
