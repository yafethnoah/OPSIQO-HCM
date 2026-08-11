# OPSIQO HCM — Upgrade to v0.8.0

## Scope

v0.8 adds the Leave, Time & Attendance Core on top of v0.7 Document, Policy & Compliance Core.

## New collections

- `leaveTypes`
- `leaveBalances`
- `leaveRequests`
- `holidayCalendars`
- `holidays`
- `timePolicies`
- `workerTimeProfiles`
- `timeEntries`
- `timeExceptions`
- `timesheets`
- `payrollExports`

Direct browser access to these collections is intentionally disabled in Firestore Rules. Relationship-aware authorization is performed by the server API.

## Upgrade steps

1. Back up Firestore and Storage before deployment.
2. Install dependencies and run the full acceptance suite.
3. Deploy the updated Firestore indexes and rules.
4. Seed or configure at least one time policy, holiday calendar and leave plan before assigning workers.
5. Assign every participating worker a `workerTimeProfile`.
6. Review every jurisdiction reference template with qualified HR/legal/payroll owners before enabling it operationally.
7. Run the time/leave governance job in a non-production environment and review generated balances, time exceptions and timesheets.
8. Reconcile the first payroll CSV against the payroll system before enabling operational export.

## Commands

```powershell
npm install --registry=https://registry.npmjs.org
npm run typecheck
npm test
npm run test:rules
npm run build

npm run dev:backend
npm run seed
npm run dev:frontend
```

Run the governance review manually:

```powershell
$env:OPSIQO_JOB_ORG_ID="YOUR_ORG_ID"
npm run time:review
```

The shared automation cycle also processes leave accrual and time governance when `npm run jobs:run` is scheduled.

## Ontario reference-profile warning

The included Ontario values are **reference defaults, not legal conclusions for every worker**. Exemptions, special rules, collective agreements, employment contracts and other legislation can change entitlements or thresholds. Keep `complianceMode: advisory` until your organization has validated the configuration for each covered population.

The seed profile intentionally disables geolocation. If monitoring is later enabled, document the purpose, necessity, access, retention and applicable employee-policy obligations before rollout.

## Payroll boundary

v0.8 exports approved time quantities. It does not claim to replace payroll-law calculation for every jurisdiction. Public-holiday pay, vacation pay, premium rules, statutory deductions and other payroll calculations should remain in or be reconciled with an approved payroll engine.
