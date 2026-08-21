# Start Here — OPSIQO ONE V7.20

## Release identity

**OPSIQO ONE v7.20 · HCM v8.5**

This release is source-complete/source-audited and should be dependency-certified in a fresh Windows extraction before deployment.

## First command

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_ONE_V7_20_VALIDATION.ps1
```

The runner does not intentionally print secrets and does not deploy Firebase/App Hosting.

## V7.20 UAT priorities

1. Switch EN/FR/ES/AR on Recruiting, Performance and Compensation.
2. Verify Arabic RTL and reviewed Arabic markers.
3. Test authenticated 320px browser matrix including Performance/Compensation.
4. Open Intelligence and confirm Project/Funding graph counts appear only with `workforce.read`.
5. Open Scenario Lab and confirm Digital Twin project/funding counts.
6. Re-test the consequential-action firewall.
7. Confirm Safe Execute still contains only directly-targeted notification read action.
8. Re-test MFA and tenant isolation before deployment.
