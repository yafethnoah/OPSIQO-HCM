# Start Here — OPSIQO ONE V7.25

## Overall program status

OPSIQO ONE is approximately **96% complete** against the current roadmap. V7.25 itself is source-complete. The remaining program work is primarily dependency-backed production certification, manual accessibility closure, final multilingual backlog reduction, and controlled production connector UAT.

## Critical V7.25 certification fix

V7.24 referenced `firebase.test.json` during authenticated emulator UAT, but that isolated config was not packaged. V7.25 adds and verifies a dedicated `firebase.test.json` with local-only Auth, Firestore and Storage emulator ports and no production project id.

## Windows certification

Run from a newly extracted V7.25 folder:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_ONE_V7_25_VALIDATION.ps1
```

The runner does not intentionally print `.env` contents, API keys, tokens, cookies, passwords, or private keys. It does not deploy Firebase or App Hosting.

V7.25 also writes a sanitized gate ledger to:

`artifacts\v7-25-certification-ledger.json`

The ledger contains gate name, pass/fail status, duration and exit code only; it is intended to make failed Windows certification runs easier to diagnose and share safely.

## V7.25 UAT focus

1. Regulatory Change Center in EN/FR/ES/AR and Arabic RTL.
2. Resilience / continuity in EN/FR/ES/AR and Arabic RTL.
3. Identity / SSO / provisioning in EN/FR/ES/AR and Arabic RTL.
4. Governance Control Center in EN/FR/ES/AR and Arabic RTL.
5. Enterprise Command Center in EN/FR/ES/AR and Arabic RTL.
6. Authenticated 320px mobile/accessibility checks for the five new routes.
7. Isolated Firebase emulator startup through the packaged `firebase.test.json` and locked Firebase CLI.
8. Full V7.24→V7.10 + MFA/HCM/ATS/ESS/automation regression chain.
9. Safe Execute remains limited to the signed-in user's directly targeted unread notifications.
