# Upgrade to v1.1 — Phase 3 Performance Core

## 1. Back up and branch
Create a deployment branch and back up the target Firebase project before applying new indexes/rules.

## 2. Install from the approved registry
```powershell
npm install --registry=https://registry.npmjs.org
npm run typecheck
npm test
npm run test:rules
npm run build
```
Commit the generated `package-lock.json` and use `npm ci` in CI/CD after the first successful install.

## 3. Deploy Firestore indexes/rules to staging
The release adds indexes and server-only rules for performance cycles, goals, reviews, competencies, feedback evidence, development plans and PIPs.

## 4. Seed or configure a cycle
For local/demo use:
```powershell
npm run seed
```
The demo seed includes the 2026 performance cycle, competencies, goals, reviews, a development plan and a performance workflow.

## 5. Run performance governance
```powershell
$env:OPSIQO_JOB_ORG_ID="YOUR_ORG_ID"
npm run performance:review
```
For production, schedule the shared automation worker so performance governance is evaluated alongside the other lifecycle controls.

## 6. Validate role boundaries
Confirm Employee, Manager, HR Partner and HR Admin behaviour using `PHASE3_ACCEPTANCE.md`. Pay particular attention to manager scope, calibration, PIP final decisions and 360 anonymity.
