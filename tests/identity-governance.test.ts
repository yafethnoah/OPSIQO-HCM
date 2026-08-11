import { describe, expect, it } from 'vitest';
import { identityReadiness } from '@/lib/identity/risk';
import { mappingCreateSchema, providerCreateSchema } from '@/lib/identity/schemas';

describe('v3.3 identity governance', () => {
  it('keeps healthy identity governance in the resilient band', () => {
    expect(identityReadiness({
      activeProviders:2, untestedActiveProviders:0, pendingAccessApprovals:0,
      pendingProvisioningApprovals:0, overdueAccessReviews:0, orphanIdentityAccounts:0,
      inactiveMembershipActiveAccounts:0, privilegedSessionsObserved:20,
      privilegedSessionsWithoutMfa:0,
    })).toEqual({ score:100, level:'resilient' });
  });

  it('degrades materially when privileged MFA, orphan accounts and reviews fail', () => {
    const result=identityReadiness({
      activeProviders:1, untestedActiveProviders:1, pendingAccessApprovals:3,
      pendingProvisioningApprovals:2, overdueAccessReviews:2, orphanIdentityAccounts:3,
      inactiveMembershipActiveAccounts:2, privilegedSessionsObserved:10,
      privilegedSessionsWithoutMfa:5,
    });
    expect(result.score).toBeLessThan(50);
    expect(result.level).toBe('fragile');
  });

  it('prohibits automatic JIT into privileged roles', () => {
    expect(()=>mappingCreateSchema.parse({
      code:'ENTRA-HR',providerId:'11111111-1111-4111-8111-111111111111',
      claimType:'group',claimValue:'HR',role:'hr_admin',autoJitEligible:true,
    })).toThrow(/employee role/i);
  });

  it('requires protocol-specific Firebase provider identifiers', () => {
    expect(()=>providerCreateSchema.parse({
      code:'ENTRA',name:'Microsoft Entra',vendor:'microsoft_entra',protocol:'oidc',
      firebaseProviderId:'saml.entra',issuerUrl:'https://login.microsoftonline.com/example/v2.0',
      deploymentConfigRef:'firebase-auth/entra',allowedEmailDomains:['example.com'],
      jitMode:'employee_only',mfaRequired:true,managedDeviceClaimRequired:false,
    })).toThrow(/match protocol/i);
  });
});
