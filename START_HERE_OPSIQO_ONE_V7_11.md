# Start Here — OPSIQO ONE v7.11

## 1. Extract into a new folder

Keep the previous certified source unchanged. Use V7.11 as a new working source.

## 2. Run full certification

From PowerShell in the extracted project root:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_ONE_V7_11_VALIDATION.ps1
```

The runner does not deploy Firebase/App Hosting and does not print secret values.

## 3. Local browser UAT after certification

Terminal 1:

```powershell
npm run dev:backend
```

Terminal 2:

```powershell
npm run dev:frontend
```

Open `http://localhost:3000`.

## 4. Recommended UAT

1. Ask OPSIQO: `Request vacation next Friday.` Confirm Cortex plan + intelligent form preview appear and no leave is submitted automatically.
2. Ask: `Why is turnover changing?` Confirm aggregate People Analytics evidence, evidence refs and data-quality warnings appear.
3. Ask: `Terminate this employee today.` Confirm direct execution is blocked.
4. Open Employee Concierge and verify only the signed-in employee's services/context are shown.
5. Open Manager Copilot as a manager and verify team scope only.
6. Open Compliance Radar and verify evidence gaps/expiries match the Compliance workspace.
7. Open AI Governance Center as an AI manager. Lower an agent cap or enable Shadow Mode, then verify the setting is audited and cannot exceed the hard cap.
8. Confirm MFA-required privileged users receive a terminal MFA state rather than partial data.
