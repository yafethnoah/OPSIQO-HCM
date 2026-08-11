# Upgrade to v0.6.0

v0.6 is additive to the v0.5 Recruiting Core.

## 1. Preserve your current environment
Back up Firestore and any existing Storage data before deploying changes.

## 2. Configure Storage
Set the exact Firebase bucket from the Firebase Console:

```env
FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
```

Legacy projects may use `.appspot.com`.

## 3. Install and validate

```powershell
npm install --registry=https://registry.npmjs.org
npm run typecheck
npm test
npm run test:rules
npm run build
```

## 4. Deploy data/security configuration

```powershell
npx firebase deploy --only firestore:rules,firestore:indexes,storage
```

Wait for composite Firestore indexes to reach Ready before enabling onboarding traffic.

## 5. Configure production controls

```env
OPSIQO_DEMO_MODE=false
NEXT_PUBLIC_OPSIQO_DEMO_MODE=false
OPSIQO_REQUIRE_APP_CHECK=true
NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY=
APP_BASE_URL=https://your-hcm-host
RESEND_API_KEY=
ONBOARDING_FROM_EMAIL="OPSIQO HCM <noreply@your-domain>"
```

## 6. Publish real onboarding policies
The seed contains a clearly labelled demo-only conduct policy. Do not use it in production. Publish organization-approved policies in the Onboarding workspace before creating production prehire cases.

## 7. File-security requirement
v0.6 records uploaded files as `not_scanned`. Do not treat extension/MIME validation as malware protection. Integrate a malware/DLP scanner before production HR users open untrusted candidate files.

## 8. Smoke test
1. Create/approve/send/accept a test offer.
2. Start preboarding from that offer.
3. Open the generated candidate link in a separate browser profile.
4. Complete profile and emergency-contact data.
5. Upload test documents.
6. Acknowledge a test policy.
7. Complete HR/manager/IT pre-start tasks.
8. Confirm status becomes `ready_for_activation`.
9. Confirm activation fails before the accepted start date.
10. On the start date, activate and verify Worker, Employment, Assignment, requisition opening and position occupancy exactly once.
