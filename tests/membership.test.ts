import { describe, expect, it } from 'vitest';
import { invitationActionSchema } from '../src/lib/membership/schemas';

describe('invitation lifecycle validation', () => {
  it('accepts resend with bounded expiry', () => {
    expect(invitationActionSchema.safeParse({ action: 'resend', expiresInDays: 7 }).success).toBe(true);
  });

  it('accepts revocation with a reason', () => {
    expect(invitationActionSchema.safeParse({ action: 'revoke', reason: 'Incorrect recipient' }).success).toBe(true);
  });

  it('rejects excessive resend expiry', () => {
    expect(invitationActionSchema.safeParse({ action: 'resend', expiresInDays: 90 }).success).toBe(false);
  });
});
