import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { invitationContextFromReturnTo } from '../../src/lib/auth/invitation-client';

const acceptInvite = readFileSync('src/components/accept-invite.tsx', 'utf8');
const signIn = readFileSync('src/app/signin/page.tsx', 'utf8');
const apphosting = readFileSync('apphosting.yaml', 'utf8');

describe('V7.9.4.4 invitation membership closure', () => {
  it('parses only internal complete OPSIQO invitation return paths', () => {
    expect(
      invitationContextFromReturnTo('/accept-invite?orgId=kris-atelier&token=abcdefghijklmnop'),
    ).toEqual({ orgId: 'kris-atelier', token: 'abcdefghijklmnop' });

    expect(invitationContextFromReturnTo('/dashboard')).toBeNull();
    expect(invitationContextFromReturnTo('https://example.com/accept-invite?orgId=x&token=abcdefghijklmnop')).toBeNull();
    expect(invitationContextFromReturnTo('/accept-invite?orgId=x&token=short')).toBeNull();
  });

  it('accepts invitations without requiring a pre-existing active organization context', () => {
    expect(acceptInvite).toContain("orgContext: 'omit'");
    expect(acceptInvite).toContain('/invitations/accept');
    expect(acceptInvite).toContain("reason: 'invitation_accept'");
  });

  it('routes invitation sign-in back to the invitation before JIT/default-tenant evaluation', () => {
    expect(signIn).toContain('invitationContextFromReturnTo');
    expect(signIn).toContain('const invitationContext=invitationContextFromReturnTo(requested);');
    expect(signIn).toContain('if(invitationContext){router.push(requested);return;}');

    const invitationGate = signIn.indexOf('if(invitationContext){router.push(requested);return;}');
    const jitCall = signIn.indexOf('const jit=await jitIfConfigured(user,orgId);');
    expect(invitationGate).toBeGreaterThan(-1);
    expect(jitCall).toBeGreaterThan(invitationGate);
  });

  it('keeps server pre-render tenant-neutral and uses the invited organization before any client default fallback', () => {
    expect(signIn).toContain("if(typeof window==='undefined')return'';");

    const invitationLookup = signIn.indexOf('const invitation=invitationContextFromReturnTo(requestedReturnTo());');
    const defaultFallback = signIn.indexOf('process.env.NEXT_PUBLIC_OPSIQO_DEFAULT_ORG_ID');
    expect(invitationLookup).toBeGreaterThan(-1);
    expect(defaultFallback).toBeGreaterThan(invitationLookup);
  });

  it('publishes the V7.9.4.4 release marker', () => {
    expect(apphosting).toContain("8.5-v7.9.4.4");
    expect(apphosting).not.toContain("8.5-v7.9.4.3");
  });
});
