# Start here — OPSIQO HCM 8.5 V7.9.3

1. Treat this project as the consolidated source after the V7.9.1 recovery.
2. Run `RUN_CODE_CERTIFICATION.cmd` on Windows/CI. It requires no fake production secrets.
3. Test Home, employee services, manager scope, recruiting, onboarding, imports, workflows and settings in a controlled UAT organization.
4. Only after code certification and UAT, run `RUN_PRODUCTION_CERTIFICATION.cmd` with genuine WIF/ADC, Firebase, App Check/MFA, monitoring, backup/PITR, DR and App Hosting compatibility evidence.
5. Keep `.github/workflows/automation-scheduler.yml` on the repository default branch using `DEPLOY_AUTOMATION_SCHEDULER_DEFAULT_BRANCH.ps1`.

Production readiness remains fail-closed: code-green does not mean production-certified.
