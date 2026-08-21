# Start Here — OPSIQO ONE V7.23

This is the complete V7.23 source package.

## First action on Windows

Open PowerShell in this extracted folder and run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_ONE_V7_23_VALIDATION.ps1
```

The runner does not intentionally print `.env` contents, API keys, tokens, cookies, passwords or private keys. It does not deploy Firebase or App Hosting.

## What the runner proves

It verifies the frozen source before installation, installs the exact lockfile dependencies, runs the V7.23 and historical OPSIQO ONE audits, translation verification, semantic TypeScript, targeted and full tests, Firestore Rules, security scan, production build, public browser accessibility smoke, isolated emulator-backed authenticated accessibility UAT, a fresh production rebuild, release gate, and final source verification.

## V7.23 UAT priorities

1. Integration Center → Production connector UAT evidence.
2. Confirm UAT export contains no secret values or staged record payloads.
3. Confirm a connector without a recent successful `mode=test` run is `Review required`.
4. Confirm open dead letters/reconciliation variance/open circuit prevent candidate status.
5. Security Operations EN/FR/ES/AR and Arabic RTL.
6. Privacy Governance EN/FR/ES/AR and Arabic RTL.
7. Audit & Assurance EN/FR/ES/AR and Arabic RTL.
8. Platform Reliability EN/FR/ES/AR and Arabic RTL.
9. Consequential command firewall and MFA regression.
