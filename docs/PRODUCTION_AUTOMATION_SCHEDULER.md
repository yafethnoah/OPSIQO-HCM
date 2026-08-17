# OPSIQO production automation scheduler

GitHub scheduled workflows execute from the repository default branch. OPSIQO therefore keeps the small hourly scheduler workflow on `main` while application releases remain on the protected certification branch.

`DEPLOY_AUTOMATION_SCHEDULER_DEFAULT_BRANCH.ps1` is dry-run by default. It synchronizes only `.github/workflows/automation-scheduler.yml` and never merges the application source into `main`.

```powershell
.\DEPLOY_AUTOMATION_SCHEDULER_DEFAULT_BRANCH.ps1 -ProjectRoot .
# After review:
.\DEPLOY_AUTOMATION_SCHEDULER_DEFAULT_BRANCH.ps1 -ProjectRoot . -Apply
```

The production repository should protect `main`, require reviewed changes, and restrict who can run the `-Apply` operation.
