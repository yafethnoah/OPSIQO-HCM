# Upgrade to OPSIQO HCM v0.5 Recruiting Core

## 1. Install dependencies

```powershell
npm install
```

## 2. Deploy Firestore indexes and rules

```powershell
npx firebase deploy --only firestore:rules,firestore:indexes
```

New collections/indexes are additive; no Phase 1 workforce data migration is required.

## 3. Run the seed only in demo/local environments

```powershell
npm run seed
```

Do not run demo seeding against production.

## 4. Verify Phase 1 background automation still runs

Recruiting uses the same domain-event dispatcher. Existing automation scheduling must continue to execute `npm run jobs:run` or the trusted `/api/internal/automation` endpoint.

## 5. Production acceptance

```powershell
npm run typecheck
npm test
npm run test:rules
npm run build
```

Then test the end-to-end path:

`draft requisition → submit → approve → open → candidate → interview → scorecard → offer → approve → send → accept → hire conversion`.

For v0.5, use a hire date of today or earlier. Future-effective hire conversion intentionally remains blocked until the onboarding/prehire increment.
