import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const yaml = readFileSync('apphosting.yaml', 'utf8');
const service = readFileSync('src/lib/membership/service.ts', 'utf8');
const webhook = readFileSync('src/lib/membership/resend-webhook.ts', 'utf8');

describe('H51.56 invitation runtime secret bindings', () => {
  it('binds the Resend send/runtime authority explicitly', () => {
    expect(yaml).toContain('variable: RESEND_API_KEY');
    expect(yaml).toContain('secret: OPSIQO_RESEND_API_KEY');
    expect(yaml).toContain('variable: INVITATION_FROM_EMAIL');
    expect(yaml).toContain('secret: OPSIQO_INVITATION_FROM_EMAIL');
  });

  it('binds signed webhook verification explicitly', () => {
    expect(yaml).toContain('variable: RESEND_WEBHOOK_SECRET');
    expect(yaml).toContain('secret: OPSIQO_RESEND_WEBHOOK_SECRET');
    expect(webhook).toContain('RESEND_WEBHOOK_SECRET');
  });

  it('keeps all invitation mail secrets runtime-only', () => {
    const blocks = [
      'variable: RESEND_API_KEY',
      'variable: INVITATION_FROM_EMAIL',
      'variable: RESEND_WEBHOOK_SECRET',
    ];
    for (const marker of blocks) {
      const start = yaml.indexOf(marker);
      expect(start).toBeGreaterThanOrEqual(0);
      expect(yaml.slice(start, start + 180)).toContain('availability: [RUNTIME]');
    }
  });

  it('preserves H51.55 non-expiring and truthful delivery semantics', () => {
    expect(service).toContain("NEVER_EXPIRES_AT");
    expect(service).toContain("delivery: 'submitted' as const");
    expect(service).toContain('invitationDeliveryMessageIndex');
  });
});