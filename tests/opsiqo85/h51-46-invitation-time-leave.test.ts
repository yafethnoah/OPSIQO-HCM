import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

describe('H51.46 invitation + Time & Leave integration', () => {
  it('preserves the legacy H48 invitation copy contract', () => {
    const email = source('src/lib/membership/invitation-email.ts');
    expect(email).toContain('Set my password');
    expect(email).toContain('Download OPSIQO');
    expect(email).toContain('never emails your password');
  });
  it('defaults invitations to Time & Leave', () => {
    const domain = source('src/domain/pulse-invitation-settings.ts');
    expect(domain).toContain("landingPath: '/time'");
    expect(domain).toContain("webButtonLabel: 'Open Time & Leave'");
  });

  it('stores organization-controlled mobile links with HTTPS validation', () => {
    const service = source('src/lib/membership/pulse-invitation-settings.ts');
    expect(service).toContain("iOS app URL must be blank or use HTTPS.");
    expect(service).toContain("Android app URL must be blank or use HTTPS.");
    expect(service).toContain("membership.pulse_invitation_settings.update");
  });

  it('requires governed membership management to edit invitation settings', () => {
    const route = source('src/app/api/organizations/[orgId]/pulse-invitation-settings/route.ts');
    expect(route).toContain("requirePermission(actor, 'membership.manage')");
  });

  it('invitation email contains app distribution and Time & Leave access', () => {
    const email = source('src/lib/membership/invitation-email.ts');
    expect(email).toContain('Download OPSIQO Pulse');
    expect(email).toContain('Time & Leave access');
    expect(email).toContain('webButtonLabel');
  });

  it('delivery loads organization settings and returns a Time & Leave URL', () => {
    const membership = source('src/lib/membership/service.ts');
    expect(membership).toContain('getPulseInvitationSettingsByOrgId');
    expect(membership).toContain('pulseDistributionLinks');
    expect(membership).toContain('timeLeaveUrl: signInUrl');
  });

  it('employee acceptance lands employee role on /time', () => {
    const accept = source('src/components/accept-invite.tsx');
    expect(accept).toContain("if (role === 'employee') return '/time'");
    expect(accept).toContain('Open Time & Leave');
  });

  it('download page consumes organization app links and web landing', () => {
    const download = source('src/app/download-app/page.tsx');
    expect(download).toContain('getPulseInvitationSettingsByOrgId');
    expect(download).toContain("let landingPath = '/time'");
  });

  it('employee profile exposes invitation editor and Time & Leave entry', () => {
    const profile = source('src/components/employee-profile.tsx');
    expect(profile).toContain('Edit invitation & app links');
    expect(profile).toContain('Open Time & Leave');
  });

  it('invitation console exposes the generated Time & Leave URL', () => {
    const panel = source('src/components/invitation-panel.tsx');
    expect(panel).toContain('Copy Time & Leave link');
    expect(panel).toContain('/settings/mobile-invitations');
  });
});
