import { describe, expect, it } from 'vitest';
import {
  invitationActionSchema,
  invitationCreateSchema,
  pulseInvitationResolveSchema,
} from '@/lib/membership/schemas';
import {
  buildInvitationEmailHtml,
  pulseInvitationAcceptUrl,
} from '@/lib/membership/invitation-email';

describe('H50.2 OPSIQO Pulse mobile invitation', () => {
  it('defaults invitation expiry to seven days and supports Pulse experience', () => {
    const result = invitationCreateSchema.parse({
      email: 'employee@example.com',
      role: 'employee',
      experience: 'pulse',
    });
    expect(result.expiresInDays).toBe(7);
    expect(result.experience).toBe('pulse');
  });

  it('allows a pending invitation to be resent as Pulse without changing its role contract', () => {
    expect(invitationActionSchema.parse({
      action: 'resend',
      expiresInDays: 7,
      experience: 'pulse',
    })).toMatchObject({
      action: 'resend',
      expiresInDays: 7,
      experience: 'pulse',
    });
  });

  it('requires an org and sufficiently strong token for public Pulse resolution', () => {
    expect(() => pulseInvitationResolveSchema.parse({ orgId: 'org-1', token: 'short' })).toThrow();
    expect(pulseInvitationResolveSchema.parse({
      orgId: 'org-1',
      token: 'a'.repeat(43),
    }).orgId).toBe('org-1');
  });

  it('keeps the raw Pulse token in the URL fragment rather than query/path', () => {
    const url = pulseInvitationAcceptUrl('org-1', 'token-value-abcdefghijklmnopqrstuvwxyz');
    expect(url).toContain('/invite#orgId=org-1&token=');
    expect(url).not.toContain('/invite?');
    expect(url).not.toContain('/invite/token-value');
  });

  it('renders branded Pulse onboarding and never includes a supplied password', () => {
    const html = buildInvitationEmailHtml({
      organizationName: 'Kris Atelier',
      role: 'employee',
      passwordSetupUrl: 'https://example.com/set-password',
      signInUrl: 'https://example.com/signin',
      acceptUrl: 'https://example.com/invite#orgId=o&token=t',
      downloadUrl: 'https://example.com/download-app',
      expiresAt: '2026-09-13T00:00:00.000Z',
      experience: 'pulse',
      iosUrl: 'https://example.com/testflight',
      androidUrl: 'https://example.com/play',
      supportEmail: 'hr@example.com',
    });
    expect(html).toContain('OPSIQO Pulse');
    expect(html).toContain('Kris Atelier');
    expect(html).toContain('Complete multi-factor verification');
    expect(html).toContain('Clock In');
    expect(html).toContain('never sends your password');
  });
});