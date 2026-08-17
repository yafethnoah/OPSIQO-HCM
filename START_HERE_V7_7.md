# Start Here — OPSIQO HCM 8.5 V7.7 Automation-Max

This package is the V7.6 clean/fixed source plus the V7.7 automation control plane.

## 1. Validate the immutable package

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_8_5_V7_7_AUTOMATION_VALIDATION.ps1
```

The runner verifies the frozen source manifest before and after the full gate. It never regenerates the manifest.

## 2. Review automation boundaries

Read:

```text
AUTOMATION_V7_7.md
```

Safe operational/governance work is automated. Consequential employment, pay, succession, privileged-access and legal/publication decisions remain human-approved.

## 3. Configure Firebase/App Hosting production controls

Do not copy `.env.local` into source control. Synchronize the Firebase Web config using:

```powershell
npm run firebase:sync-web-config -- --project <firebase-project-id> --app <firebase-web-app-id>
```

Production secrets belong in Secret Manager/App Hosting environment configuration.

## 4. Scheduler

After the production runtime is certified, schedule the protected `/api/internal/automation` endpoint every 30–60 minutes. Use `scope: all` for one multi-tenant scheduler or `scope: organization` for tenant-specific execution.

## 5. Production certification still requires external evidence

App Check, privileged MFA, IAM, production monitoring, PITR/backup, controlled restore/DR evidence and deployed authenticated UAT must be proven against the actual cloud environment. They are not fabricated inside this ZIP.
