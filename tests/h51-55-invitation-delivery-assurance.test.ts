import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const service = readFileSync('src/lib/membership/service.ts', 'utf8');
const panel = readFileSync('src/components/invitation-panel.tsx', 'utf8');
const profile = readFileSync('src/components/employee-profile.tsx', 'utf8');
const email = readFileSync('src/lib/membership/invitation-email.ts', 'utf8');
const webhook = readFileSync('src/lib/membership/resend-webhook.ts', 'utf8');
const route = readFileSync('src/app/api/webhooks/resend/route.ts', 'utf8');
const security = readFileSync('src/domain/security.ts', 'utf8');

describe('H51.55 invitation delivery assurance', () => {
  it('keeps invitations non-expiring and preserves explicit revoke', () => {
    expect(service).toContain("const NEVER_EXPIRES_AT = '9999-12-31T23:59:59.999Z'");
    expect(service).toContain('H51.55: invitations are intentionally non-expiring');
    expect(service).not.toContain("Invitation has expired.");
    expect(panel).toContain('Does not expire');
    expect(email).toContain('does not expire automatically');
    expect(service).toContain("status: 'revoked'");
  });

  it('never equates provider submission with mailbox delivery', () => {
    expect(service).toContain("delivery: 'submitted' as const");
    expect(panel).toContain('Mailbox delivery confirmation is pending');
    expect(panel).not.toContain('Invitation email delivered.');
    expect(profile).toContain('Delivery confirmation is pending');
    expect(security).toContain("'submitted' | 'sent' | 'delivered'");
  });

  it('stores provider message evidence and verifies signed webhooks', () => {
    expect(service).toContain('providerMessageId');
    expect(service).toContain('invitationDeliveryMessageIndex');
    expect(webhook).toContain('RESEND_WEBHOOK_SECRET');
    expect(webhook).toContain('timingSafeEqual');
    expect(webhook).toContain('resendWebhookEvents');
    expect(webhook).toContain("case 'email.delivered'");
    expect(webhook).toContain("case 'email.bounced'");
    expect(route).toContain('processResendWebhook');
  });

  it('keeps secure admin fallback links even after provider submission', () => {
    expect(panel).toContain("setInviteLink(response.inviteUrl || '')");
    expect(panel).toContain("setPasswordLink(response.passwordSetupUrl || '')");
    expect(service).toContain('passwordSetupUrl: input.passwordSetupUrl');
    expect(service).toContain('rotatedToken: true');
  });
});
