import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildInvitationEmailHtml, invitationDownloadUrl, invitationSignInUrl } from '../src/lib/membership/invitation-email';

const source = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8');

describe('H48 employee account and invitation platform', () => {
  it('builds a password-setup invitation without emailing a password', () => {
    process.env.APP_BASE_URL = 'https://uat.opsiqo.ca';
    const html = buildInvitationEmailHtml({
      organizationName: 'Kris Atelier',
      role: 'employee',
      passwordSetupUrl: 'https://example.test/set-password',
      signInUrl: invitationSignInUrl('kris-atelier'),
      acceptUrl: 'https://uat.opsiqo.ca/accept-invite?token=test',
      downloadUrl: invitationDownloadUrl(),
      expiresAt: '2026-09-10T00:00:00.000Z',
    });

    expect(html).toContain('Set my password');
    expect(html).toContain('Download OPSIQO');
    expect(html).toContain('never emails your password');
    expect(html).toContain('https://uat.opsiqo.ca/download-app');
    expect(html).not.toMatch(/temporary password/i);
  });

  it('keeps identity creation and password setup on the server', () => {
    const access = source('src/lib/membership/account-access.ts');
    expect(access).toContain('adminAuth().generatePasswordResetLink');
    expect(access).toContain('auth.createUser');
    expect(access).toContain('auth.getUserByEmail');
  });

  it('provisions membership and supports activation reconciliation', () => {
    const service = source('src/lib/membership/service.ts');
    expect(service).toContain('provisionInvitationAccess');
    expect(service).toContain("accountStatus: 'password_setup_pending'");
    expect(service).toContain('reconcileProvisionedInvitationForIdentity');
    expect(service).toContain("accountStatus: 'active'");
  });

  it('does not require an employee to type an organization id after sign in', () => {
    const signin = source('src/app/signin/page.tsx');
    const organization = source('src/lib/organization/service.ts');
    expect(signin).toContain('/api/me/organizations');
    expect(organization).toContain('reconcileProvisionedInvitationForIdentity');
  });

  it('keeps app distribution URLs outside source code', () => {
    const page = source('src/app/download-app/page.tsx');
    expect(page).toContain('NEXT_PUBLIC_OPSIQO_ANDROID_APP_URL');
    expect(page).toContain('NEXT_PUBLIC_OPSIQO_IOS_APP_URL');
  });
});
