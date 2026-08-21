# Start Here — OPSIQO ONE v7.16

## 1. Use a fresh extracted folder

Do not overwrite the working V7.15 directory. Extract the V7.16 ZIP into a new folder.

## 2. Run the complete Windows certification

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_ONE_V7_16_VALIDATION.ps1
```

The runner does not deploy Firebase/App Hosting and is written not to print `.env` values, API keys, tokens, cookies or private keys.

## 3. Start locally after certification

Backend:

```powershell
npm run dev:backend
```

Frontend in a second PowerShell window:

```powershell
npm run dev:frontend
```

Open `http://localhost:3000` unless your local configuration uses another port.

## 4. V7.16 UAT order

1. Open **Program Workforce Intelligence** with `workforce.read`.
2. Create a project with `workforce.manage`; verify project dates cannot exceed the funding source period.
3. Link a grant workforce allocation to a project; verify source/date/project guards and the existing 100% overlap limit.
4. Confirm Program Workforce displays only explicit planned funded cost and shows **Not configured** instead of inferring salary.
5. Create a Meeting → Action draft, review it, then promote selected open actions with `workflow.manage`.
6. Confirm the promoted workflow is `enabled = false` and requires a separate activation action.
7. In Ask OPSIQO, run **Mark my notifications as read** with `notifications.read`.
8. Confirm only notifications explicitly targeted to the signed-in user are changed and shared role notifications remain untouched.
9. Try a combined request such as “Mark my notifications read and terminate Ahmed now”; confirm the consequential-action block wins.
10. Test high contrast, strong focus, larger text, reduced motion and underlined links.
11. Test route-change announcements with keyboard/screen reader tooling.
12. Test English, French, Spanish and Arabic shell behavior; confirm Arabic RTL and evidence identifiers remain unchanged.
13. Review **Experience Readiness** and confirm it does not claim full WCAG conformance or full legacy translation.
14. Re-test MFA, tenant switching, Agent Builder approval, Organizational Memory privacy, Grant Workforce, ESS and ATS/import flows.

## Certification boundary

Source-level V7.16 architecture, syntax and regression audits are included in the package. Full dependency-backed certification still requires the supplied runner to complete `npm ci`, semantic TypeScript, Vitest, Firestore Rules, security scan, production build and release gate on a machine with registry access.
