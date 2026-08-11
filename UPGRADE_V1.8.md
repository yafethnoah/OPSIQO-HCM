# Upgrade to v1.8

From v1.7:

```powershell
npm install --registry=https://registry.npmjs.org
npm run typecheck
npm test
npm run test:rules
npm run build
```

Deploy the updated Firestore indexes/rules using your normal controlled Firebase deployment process.

Seed/local demo:
```powershell
npm run seed
```

Scheduled governance:
```powershell
$env:OPSIQO_JOB_ORG_ID="YOUR_ORG_ID"
npm run workforce:review
```

No automatic salary or workforce-plan migration is performed. Create the first production workforce plan with Finance/HR-approved assumptions, then generate a fresh baseline snapshot through the server API/workspace before modelling scenarios.
