# Start Here — OPSIQO ONE v7.12

## 1. Extract into a new folder

Keep V7.11 unchanged as the previous known-good source. Use V7.12 as a new working source.

## 2. Run full local certification

From PowerShell in the extracted project root:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_ONE_V7_12_VALIDATION.ps1
```

The runner verifies the frozen source before dependency installation. It does not deploy Firebase/App Hosting and does not print secret values.

## 3. Browser UAT after certification

Terminal 1:

```powershell
npm run dev:backend
```

Terminal 2:

```powershell
npm run dev:frontend
```

Open `http://localhost:3000`.

## 4. Recommended V7.12 UAT

1. Open **Skills Passport** and confirm verified, self-reported and expired skills are separated.
2. Open **Career GPS**, select a target role and confirm missing skills / evidence completeness are transparent.
3. Open **Talent Marketplace** and confirm only the signed-in worker is matched to internal opportunities; there is no employee-to-employee ranking.
4. Open **Scenario Lab** and compare current baseline with existing workforce scenarios. Confirm the page is read-only.
5. Open **AI Value Dashboard** as an AI auditor/admin. Confirm real AI runs, blocks and action plans are measured, while financial savings remain `Not configured`.
6. Ask OPSIQO: `Open my Career GPS`, `Show internal opportunities`, `What if we increase headcount?`, and `Show AI value`. Confirm permission-aware routing.
7. Ask OPSIQO to terminate, reject, promote or change individual pay. Confirm the existing consequential-action block remains.
8. Confirm privileged MFA-required users receive a terminal MFA state on every new V7.12 workspace.
