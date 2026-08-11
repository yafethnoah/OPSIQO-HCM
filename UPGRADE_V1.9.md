# Upgrade Guide — v1.8 → v1.9

## 1. Install and validate
```powershell
npm install --registry=https://registry.npmjs.org
npm run typecheck
npm test
npm run test:rules
npm run build
```
Commit the generated `package-lock.json`, then use `npm ci` in CI.

## 2. Deploy database controls
Deploy updated:
- `firestore.rules`
- `firestore.indexes.json`

New server-only collections:
- `analyticsMetrics`
- `analyticsMetricCodeIndex`
- `analyticsSnapshots`
- `analyticsForecastModels`
- `analyticsForecastModelCodeIndex`
- `analyticsForecastRuns`

## 3. Bootstrap the semantic layer
```powershell
$env:OPSIQO_JOB_ORG_ID="YOUR_ORG_ID"
npm run analytics:bootstrap
```
This creates standard metric definitions and a current snapshot. It does **not** fabricate prior periods.

## 4. Historical migration
If trustworthy historical aggregate data exists, migrate it through an approved one-time migration that preserves:
- period date;
- metric definition/version;
- source system;
- transformation methodology;
- reporting currency;
- data-quality limitations.

Do not generate historical records by extrapolating current employees backwards.

## 5. Forecast model activation
Create models in `/people-analytics`, review assumptions, then activate with HR-admin authority. Scheduled automation generates at most one run per active model per calendar month. Additional manual runs are explicitly initiated and audited.

## 6. Operations
```powershell
npm run analytics:review
npm run preflight:production
npm run uat:lifecycle
```
