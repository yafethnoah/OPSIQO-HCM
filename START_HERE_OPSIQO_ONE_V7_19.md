# Start Here — OPSIQO ONE V7.19

## Release identity

**OPSIQO ONE v7.19 · HCM v8.5**

## What changed

1. Reviewed EN/FR/ES/AR catalog expanded to Time & Leave and Learning & Skills.
2. Translation inventory improves from 88 reviewed candidates in V7.18 to 243 in V7.19.
3. Authenticated accessibility browser matrix expands to Time, Learning and Recruiting.
4. Program Portfolio export serialization is pure/testable and advances to the V7.19 evidence-pack schema.
5. AI Execute remains intentionally limited to direct-user notification read state.

## Windows certification

Run from a newly extracted folder:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_ONE_V7_19_VALIDATION.ps1
```

The runner does not deploy Firebase/App Hosting and does not intentionally print `.env` values, API keys, tokens, cookies or private keys.

## After certification

Backend:

```powershell
npm run dev:backend
```

Frontend in a second PowerShell window:

```powershell
npm run dev:frontend
```

Recommended UAT: Time & Leave in EN/FR/ES/AR, Learning & Skills in EN/FR/ES/AR, Arabic RTL, Recruiting mobile accessibility, Program Portfolio CSV/JSON exports, Safe Execute isolation, MFA and tenant isolation.
