import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('H50.2B automatic invitation email delivery', () => {
  const uat = fs.readFileSync('apphosting.uat.yaml', 'utf8');
  const service = fs.readFileSync('src/lib/membership/service.ts', 'utf8');
  const panel = fs.readFileSync('src/components/pulse-invitation-panel.tsx', 'utf8');

  it('keeps the deployment locked to the UAT environment', () => {
    expect(uat).toContain('value: opsiqo-hcm-uat-2026');
    expect(uat).toContain('value: https://uat.opsiqo.ca');
  });

  it('loads Resend credentials only from UAT Secret Manager references', () => {
    expect(uat).toContain('variable: RESEND_API_KEY');
    expect(uat).toContain('secret: UAT_OPSIQO_RESEND_API_KEY');
    expect(uat).toContain('variable: INVITATION_FROM_EMAIL');
    expect(uat).toContain('secret: UAT_OPSIQO_INVITATION_FROM_EMAIL');
    expect(uat).not.toMatch(/RESEND_API_KEY\s*\n\s*value:/);
    expect(uat).not.toMatch(/INVITATION_FROM_EMAIL\s*\n\s*value:/);
  });

  it('uses the existing governed Resend delivery path', () => {
    expect(service).toContain('process.env.RESEND_API_KEY');
    expect(service).toContain('process.env.INVITATION_FROM_EMAIL');
    expect(service).toContain("https://api.resend.com/emails");
  });

  it('preserves manual secure-link fallback when email is unavailable', () => {
    expect(service).toContain("delivery: 'manual' as const");
    expect(service).toContain('inviteUrl: input.inviteUrl');
  });

  it('distinguishes provider failure from missing configuration in the employee UI', () => {
    expect(panel).toContain('Automatic email delivery failed');
    expect(panel).toContain('Automatic email delivery is not configured');
    expect(panel).toContain('invitation sent automatically');
  });
});