# Start Here — OPSIQO ONE v7.17

## Release

**OPSIQO ONE v7.17 · HCM v8.5 — Accessibility Translation Portfolio Execution**

## First action on Windows

Open PowerShell in the extracted project root and run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_ONE_V7_17_VALIDATION.ps1
```

The runner does not deploy Firebase/App Hosting and does not intentionally print `.env` values, API keys, tokens, cookies or private keys.

## What the runner proves

1. frozen source matches the release manifest before install;
2. clean source tree before dependency installation;
3. exact lockfile dependency installation;
4. V7.17 and historical OPSIQO ONE source contracts;
5. semantic TypeScript and Vitest suites;
6. Firestore Rules isolation and security scan;
7. production Next.js build and release gate;
8. translation source inventory;
9. real-browser public-route accessibility smoke against the built local application;
10. final frozen-source verification.

The browser smoke is accessibility evidence, **not** a full WCAG 2.2 AA certification.

## Local development after certification

Backend PowerShell:

```powershell
npm run dev:backend
```

Frontend PowerShell:

```powershell
npm run dev:frontend
```

Default local application URL is normally `http://localhost:3000` unless the local runtime scripts select another port.

## V7.17 UAT order

1. Program Portfolio read access with `workforce.read`.
2. Record source-referenced budget/actual/commitment/forecast evidence with `workforce.manage`.
3. Reject project/source mismatch, out-of-period evidence and currency mismatch.
4. Confirm separate currency summaries and missing-evidence states.
5. Meeting → Workflow: test all three templates and verify each new workflow is disabled.
6. Verify the existing safe notification Execute action still changes only direct `targetUid` notifications.
7. Verify candidate Execute actions remain held for UAT.
8. Run accessibility checks on sign-in/register/password-reset and representative authenticated flows.
9. Review translation inventory and test EN/FR/ES/AR, including Arabic RTL.
10. Re-test MFA, tenant isolation and consequential-command blocking.
