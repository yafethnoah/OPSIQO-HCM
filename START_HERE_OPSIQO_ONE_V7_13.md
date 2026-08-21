# Start Here — OPSIQO ONE v7.13

This package is the V7.13 source release candidate for Agent Builder, Organizational Memory, Policy Intelligence, and Automation Marketplace.

## Windows certification
1. Extract the ZIP into a new folder.
2. Open PowerShell in that folder.
3. Run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\RUN_OPSIQO_ONE_V7_13_VALIDATION.ps1
```

The runner verifies the frozen source before dependency installation, installs the exact lockfile dependencies, runs V7.13 and regression audits/tests, Firestore Rules, security scan, production build, release gate, and final source verification. It does not deploy Firebase/App Hosting and is designed not to print secret values.

## Recommended UAT sequence
1. Agent Builder: create draft → submit review → independent activation → retire.
2. AI Governance: confirm custom active agent visibility and authority ceiling.
3. Organizational Memory: search policy/knowledge/workflow content and inspect internal citation IDs.
4. Ask OPSIQO: ask an organization-policy question and confirm evidence citations.
5. Policy Intelligence: review due/overdue, acknowledgement, overlap, editorial, and workflow signals.
6. Automation Marketplace: install a pack and confirm all installed workflows are disabled.
7. Workflows: separately enable one reviewed workflow and confirm audit behavior.
8. Consequential-action checks: confirm termination/hiring/pay/succession decisions remain human governed.
9. MFA terminal-state checks on all new workspaces.
