# Upgrade to OPSIQO HCM v3.3

## 1. Start from v3.2
Use the complete v3.2 Integration Runtime release. Preserve all existing Firebase, AI, privacy, governance and integration configuration.

## 2. Install the v3.3 source
Replace the application source with v3.3, then generate and review a trusted npm lockfile in an approved environment. Do not promote from an unreviewed dependency tree.

## 3. Configure enterprise identity
Add only after the organization's IdP/Firebase federation configuration is ready:

```env
OPSIQO_RELEASE_VERSION=3.3.0
OPSIQO_ENABLE_ENTERPRISE_SSO=true
OPSIQO_IDENTITY_HOSTS=login.example-idp.com
OPSIQO_ALLOWED_ADMIN_PROVIDERS=oidc.company
OPSIQO_PUBLIC_SSO_DISCOVERY=false
NEXT_PUBLIC_OPSIQO_DEFAULT_ORG_ID=
```

Use exact provider/tenant hosts. Do not use wildcard egress. Do not place client secrets, signing keys or SAML assertions in these variables.

## 4. Configure Firebase federation
Create the corresponding OIDC or SAML provider in Firebase Authentication / Identity Platform. The Firebase provider ID must match the OPSIQO governed provider profile (`oidc.*` or `saml.*`). OPSIQO stores a deployment configuration reference, not the IdP client secret.

## 5. Bootstrap provider and mapping governance
From `/identity`:
1. Create provider profile.
2. Submit for independent review.
3. Test metadata.
4. Approve and activate only after a current passing test.
5. Create role mappings.
6. Approve mappings independently.
7. Enable `autoJitEligible` only for an employee mapping when the organization explicitly wants employee-only JIT.

## 6. Validate access-review and reconciliation workflows
Run an access review in a non-production environment. Capture identity reconciliation. Confirm orphan identities and inactive-membership accounts surface as exceptions.

## 7. Configure SCIM create provisioning, if used
Use the v3.2 Integration Center to approve an outbound `scim_users` runtime profile. v3.3 provisioning requests reference that profile. Native update/disable remains fail-closed until a deployment adapter can address the remote SCIM resource safely and idempotently.

## 8. Run all release gates
```powershell
npm ci
npm run release:gate
npm run typecheck
npm test
npm run test:rules
npm run build
npm run ai:evaluate
npm run ai:governance-check
npm run preflight:production
npm run uat:lifecycle
```

## 9. Rollout strategy
Pilot SSO with HR/admin testers first, keep password/fallback access according to organization security policy, verify MFA/provider restrictions, then expand to employee JIT only after reconciliation and access-review evidence is clean.
