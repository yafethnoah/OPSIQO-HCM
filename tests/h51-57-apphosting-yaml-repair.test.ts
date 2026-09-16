import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const yaml = readFileSync('apphosting.yaml', 'utf8');

describe('H51.57 App Hosting YAML repair', () => {
  it('keeps each invitation secret binding as its own env item', () => {
    expect(yaml).toContain(`  - variable: RESEND_API_KEY
    secret: OPSIQO_RESEND_API_KEY
    availability: [RUNTIME]`);
    expect(yaml).toContain(`  - variable: INVITATION_FROM_EMAIL
    secret: OPSIQO_INVITATION_FROM_EMAIL
    availability: [RUNTIME]`);
    expect(yaml).toContain(`  - variable: RESEND_WEBHOOK_SECRET
    secret: OPSIQO_RESEND_WEBHOOK_SECRET
    availability: [RUNTIME]`);
  });

  it('separates webhook-secret availability from the next env entry', () => {
    expect(yaml).toContain(`    availability: [RUNTIME]
  - variable: OPSIQO_RELEASE_VERSION`);
    expect(yaml).not.toContain('availability: [RUNTIME]  - variable:');
  });

  it('keeps invitation runtime variables unique', () => {
    for (const variable of [
      'RESEND_API_KEY',
      'INVITATION_FROM_EMAIL',
      'RESEND_WEBHOOK_SECRET',
    ]) {
      const matches = yaml.match(new RegExp(`^  - variable: ${variable}$`, 'gm')) || [];
      expect(matches).toHaveLength(1);
    }
  });
});