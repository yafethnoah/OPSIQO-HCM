import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sessionControls = readFileSync('src/components/session-controls.tsx', 'utf8');
const nav = readFileSync('src/components/nav.tsx', 'utf8');
const setup = readFileSync('src/app/setup/page.tsx', 'utf8');
const mfaSetup = readFileSync('src/app/mfa/setup/page.tsx', 'utf8');
const invite = readFileSync('src/components/accept-invite.tsx', 'utf8');
const switcher = readFileSync('src/components/organization-switcher.tsx', 'utf8');
const apphosting = readFileSync('apphosting.yaml', 'utf8');

describe('V7.9.4.3 auth session controls closure', () => {
  it('provides governed Firebase sign-out that clears tenant context', () => {
    expect(sessionControls).toContain('signOut(firebaseAuth())');
    expect(sessionControls).toContain('clearActiveOrgId()');
    expect(sessionControls).toContain("window.location.replace('/signin')");
    expect(sessionControls).not.toContain('getIdToken');
  });

  it('shows sign-out in authenticated navigation regardless of membership', () => {
    expect(nav).toContain("import { SessionControls } from './session-controls';");
    expect(nav).toContain('<SessionControls compact={collapsed} label="Sign out" />');
  });

  it('provides account switching on bootstrap, invitation and MFA flows', () => {
    expect(setup).toContain("import { SessionControls } from '@/components/session-controls';");
    expect(setup).toContain('Sign out / use a different account');
    expect(mfaSetup).toContain("import { SessionControls } from '@/components/session-controls';");
    expect(mfaSetup).toContain('Sign out / use a different account');
    expect(invite).toContain("import { SessionControls } from '@/components/session-controls';");
    expect(invite).toContain('Sign out / use a different account');
  });

  it('clears stale tenant context when there are no eligible memberships', () => {
    expect(switcher).toContain('clearActiveOrgId');
    expect(switcher).toContain('if (current) clearActiveOrgId();');
    expect(switcher).toContain('clearActiveOrgId();');
  });

  it('publishes the correct product release marker', () => {
    expect(apphosting).toContain("8.5-v7.9.4.3");
    expect(apphosting).not.toContain("8.5-v7.9.4.2");
  });
});
