# Start Here — OPSIQO ONE V7.21

## Release identity

**OPSIQO ONE v7.21 · HCM v8.5**

This release is source-complete/source-audited and must be dependency-certified in a fresh Windows extraction before deployment.

## First command

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_ONE_V7_21_VALIDATION.ps1
```

The runner does not intentionally print `.env` contents, API keys, tokens, cookies, passwords or private keys. It does not deploy Firebase/App Hosting.

## V7.21 UAT priorities

1. Switch EN/FR/ES/AR on Compliance/Documents, Policy Intelligence, Compliance Radar, Employee Experience, Employee Service Center and Workflows.
2. Verify Arabic RTL and reviewed Arabic markers on those surfaces.
3. Run the authenticated 320px browser matrix across all 19 V7.21 routes.
4. Open Intelligence and confirm policy/knowledge/workflow/course/path/compliance graph counts appear only under the appropriate permissions.
5. Open Scenario Lab and confirm the Digital Twin includes the expanded connected-knowledge counts.
6. Search Organizational Memory for a published learning course and verify the citation/source boundary.
7. Confirm employee-document contents do not appear in the general Knowledge Graph or Organizational Memory search.
8. Re-test the consequential-action firewall.
9. Confirm Safe Execute still contains only the directly-targeted notification-read action.
10. Re-test MFA and tenant isolation before deployment.
