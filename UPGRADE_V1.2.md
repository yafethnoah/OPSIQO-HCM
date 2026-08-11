# Upgrade Guide — v1.1 → v1.2

## 1. Preserve the v1.1 database

Back up/export the staging Firestore data before deploying new indexes/rules or seeding v1.2 demo records.

## 2. Install dependencies and create a lockfile

```powershell
npm install --registry=https://registry.npmjs.org
npm run typecheck
npm test
```

Commit the generated `package-lock.json` and use `npm ci` in CI after that point.

## 3. Deploy/test Firestore indexes and rules

v1.2 adds learning collections and indexes for worker/course assignment lookup, worker skill evidence and position skill requirements.

```powershell
npm run test:rules
firebase deploy --only firestore:rules,firestore:indexes
```

## 4. Seed demo data only in non-production environments

```powershell
npm run seed
```

The seed includes skills, position requirements, courses, a learning path, a learning assignment, a certificate and a learning-completion workflow.

## 5. Start the learning governance worker

```powershell
$env:OPSIQO_JOB_ORG_ID="YOUR_ORG_ID"
npm run learning:review
```

The normal shared automation worker also executes learning governance.

## 6. Run integrated UAT

```powershell
$env:OPSIQO_UAT_BASE_URL="https://YOUR-STAGING-HOST"
$env:OPSIQO_UAT_ORG_ID="YOUR_ORG_ID"
$env:OPSIQO_UAT_ID_TOKEN="..."
$env:OPSIQO_UAT_APP_CHECK_TOKEN="..."
npm run uat:lifecycle
```

Confirm the Skills & Learning endpoint passes alongside Core HR, Recruiting, Onboarding, Compliance, Time, Separation and Performance.

## 7. Production migration note

There is no mandatory data migration for existing v1.1 tenants because learning records are additive. Do not automatically infer verified skills from historical performance text. Seed or import skill evidence only through an approved mapping/verification process.
