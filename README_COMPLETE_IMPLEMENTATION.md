# OPSIQO HCM 8.5 Complete Implementation

This package starts from the verified 8.5 code-green source candidate and completes the product wiring requested during UAT.

## Added / wired
- Platform Settings: account/sign-out, registration/access policy, password reset, MFA/session policy, appearance/accessibility, organization/region defaults, notifications, data/import, integrations, AI/automation, security/privacy, diagnostics/system.
- Policy-aware Sign In, Register, Forgot Password and explicitly read-only Guest Access.
- Unified Import Center for employees and HR library records (policies, procedures/SOPs, contracts, forms/templates, employee documents, training and reference records).
- CSV/XLSX employee preview with duplicate/capacity validation and server-owned commit receipts.
- Governed HR library staging with SHA-256 duplicate prevention, scan/review gates, controlled download, policy-draft promotion and employee-document promotion.
- Truthful external-source status for Google Drive, OneDrive/SharePoint, HRIS/payroll exports and APIs.
- Capacity-aware Add Employee UX.
- Invitation delivery/link/resend/revoke UX.
- AI Engine Processing progress wired to live Copilot request stages.
- Professional governed Gantt wired to persisted workflow runs.
- Bounded retry for safe reads and reconciliation-required behavior for uncertain writes.
- Visible 8.1 Orchestrator, 8.2 Operations Cockpit, 8.3 Workforce Intelligence and 8.4 Evidence Center workspaces.
- My HR wording, responsive layouts, Light/Dark/System, compact density, larger font and reduced motion.

## Safety boundaries retained
AI does not directly execute consequential employment decisions. Employee imports commit through `createEmployee`. Imported policies become drafts, not automatically published. Imported document promotion is blocked until scan status is clean and review is approved. Missing/unavailable evidence remains truthful instead of being converted to zero or 100%.

## Local run (Windows)
Backend/emulators:
```powershell
npm run dev:backend
```
Frontend:
```powershell
npm run dev:frontend
```

## Full validation
```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\RUN_OPSIQO_8_5_COMPLETE_VALIDATION.ps1
```
Do not treat this modified build as code-green until the validation runner passes on the target Windows environment.


## Validation status in this package
The package includes container-side evidence for source syntax/transpilation, the OPSIQO 8.5 completion wiring audit, secret scan and source-manifest integrity. Full semantic TypeScript, Vitest, Next production build, Firestore Rules and production-preflight gates must be rerun on Windows using the included validation runner because this artifact intentionally does not ship `node_modules`.

Passing the validation runner makes this modified source **code-green**; it does not by itself constitute final production GO. Deployed UAT, external control evidence, rollback/cutover and signoff remain separate release controls.
