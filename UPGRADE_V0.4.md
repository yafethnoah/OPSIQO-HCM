# Upgrade to OPSIQO HCM Phase 1 v0.4.0

Use this sequence when upgrading a v0.3 environment.

## 1. Back up/export data
Create a Firestore backup/export appropriate to your environment before migration.

## 2. Install the exact dependency graph

```powershell
npm install
npm run typecheck
npm test
```

## 3. Deploy Rules and indexes to a non-production environment first

```powershell
npx firebase deploy --only firestore:rules,firestore:indexes
```

New/updated indexes support scheduled secondary plans, organization membership discovery and role-targeted notification delivery.

## 4. Backfill normalized worker search keys

```powershell
$env:OPSIQO_ORG_ID="your-org-id"
npm run backfill:search
```

Run once for every existing organization. New workers receive these fields automatically.

## 5. Rebuild position occupancy

```powershell
$env:OPSIQO_ORG_ID="your-org-id"
npm run rebuild:occupancy
```

Compare the output against known headcount/FTE before enabling scheduled automation.

## 6. Configure notifications
Set `RESEND_API_KEY` and `NOTIFICATION_FROM_EMAIL` only if email delivery is required. Keep email delivery disabled in the notification policy until the sender domain is verified.

## 7. Configure security controls
For production, disable demo mode. Register App Check and provide the reCAPTCHA Enterprise site key before setting `OPSIQO_REQUIRE_APP_CHECK=true`.

If privileged MFA is required, enroll/test affected administrators before setting `OPSIQO_REQUIRE_ADMIN_MFA=true`.

If using SAML/OIDC, configure the provider in Firebase Authentication with Identity Platform and test the actual Firebase `sign_in_provider` value before using `OPSIQO_ALLOWED_ADMIN_PROVIDERS`.

## 8. Run Rules emulator and production build

```powershell
npm run test:rules
npm run build
```

## 9. Enable the automation scheduler
Run one interactive admin automation cycle first and inspect `/automation`, notifications and audit evidence. Then enable the external trusted scheduler using `OPSIQO_JOB_SECRET`.

## 10. Production cutover gate
Do not cut over until `PHASE1_ACCEPTANCE.md` is signed off.
