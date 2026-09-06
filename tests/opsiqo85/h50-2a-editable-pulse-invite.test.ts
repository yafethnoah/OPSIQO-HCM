import { describe, expect, it } from 'vitest';
import { DEFAULT_PULSE_INVITATION_SETTINGS } from '@/domain/pulse-invitation-settings';
import { pulseInvitationSettingsSchema } from '@/lib/membership/pulse-invitation-settings';
import {
  buildInvitationEmailHtml,
  pulseDistributionLinks,
  renderPulseTemplateText,
} from '@/lib/membership/invitation-email';

describe('H50.2A editable OPSIQO Pulse invitation', () => {
  it('supports editable content and future HTTPS iOS / Android links', () => {
    const parsed = pulseInvitationSettingsSchema.parse({
      ...DEFAULT_PULSE_INVITATION_SETTINGS,
      iosAppUrl: 'https://testflight.apple.com/join/example',
      androidAppUrl: 'https://play.google.com/store/apps/details?id=example',
    });
    expect(parsed.iosAppUrl).toContain('testflight.apple.com');
    expect(parsed.androidAppUrl).toContain('play.google.com');
  });

  it('rejects non-HTTPS app distribution links', () => {
    expect(() => pulseInvitationSettingsSchema.parse({
      ...DEFAULT_PULSE_INVITATION_SETTINGS,
      iosAppUrl: 'http://example.com/app',
    })).toThrow();
  });

  it('renders supported invitation placeholders', () => {
    expect(renderPulseTemplateText(
      'Welcome {{role}} to {{organization}} - expires {{expires}}',
      { organization: 'Kris Atelier', role: 'employee', expires: '2026-09-13' },
    )).toBe('Welcome employee to Kris Atelier - expires 2026-09-13');
  });

  it('prefers organization-editable app links', () => {
    const links = pulseDistributionLinks({
      iosAppUrl: 'https://example.com/ios',
      androidAppUrl: 'https://example.com/android',
    });
    expect(links.ios).toBe('https://example.com/ios');
    expect(links.android).toBe('https://example.com/android');
  });

  it('preserves the H50.2 branded Pulse email when no editable settings are supplied', () => {
    const html = buildInvitationEmailHtml({
      organizationName: 'Kris Atelier',
      role: 'employee',
      passwordSetupUrl: 'https://example.com/password',
      signInUrl: 'https://example.com/signin',
      acceptUrl: 'https://example.com/invite#token=test',
      downloadUrl: 'https://example.com/download',
      expiresAt: '2026-09-13T00:00:00.000Z',
      experience: 'pulse',
    });
    expect(html).toContain('OPSIQO Pulse');
    expect(html).toContain('Complete multi-factor verification');
    expect(html).toContain('Clock In');
  });

  it('escapes editable content before email HTML rendering', () => {
    const settings = {
      ...DEFAULT_PULSE_INVITATION_SETTINGS,
      introText: 'Welcome <script>alert(1)</script> {{organization}}',
    };
    const html = buildInvitationEmailHtml({
      organizationName: 'Kris Atelier',
      role: 'employee',
      passwordSetupUrl: 'https://example.com/password',
      signInUrl: 'https://example.com/signin',
      acceptUrl: 'https://example.com/invite#token=test',
      downloadUrl: 'https://example.com/download',
      expiresAt: '2026-09-13T00:00:00.000Z',
      experience: 'pulse',
      pulseSettings: settings,
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});