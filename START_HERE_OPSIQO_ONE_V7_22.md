# Start Here — OPSIQO ONE v7.22

1. Extract this complete ZIP into a new folder.
2. Do not copy `node_modules`, `.next`, `artifacts`, logs or old build output into the folder.
3. Open PowerShell in the extracted project.
4. Run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_ONE_V7_22_VALIDATION.ps1
```

The runner does not intentionally print `.env` values, API keys, tokens, cookies, passwords or private keys. It does not deploy Firebase or App Hosting.

After the runner reports `OPSIQO ONE V7.22 CERTIFICATION PASS`, start the backend with `npm run dev:backend` and the frontend in a second PowerShell window with `npm run dev:frontend`.
