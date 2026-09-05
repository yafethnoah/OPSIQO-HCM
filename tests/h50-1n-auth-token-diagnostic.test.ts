import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('src/lib/auth/session.ts', 'utf8');

describe('H50.1N sanitized Firebase ID-token diagnostics', () => {
  it('logs only diagnostic classification fields for verifyIdToken failures', () => {
    expect(source).toContain('opsiqo_firebase_id_token_verify_failed');
    expect(source).toContain('audienceMatchesProject');
    expect(source).toContain('issuerMatchesProject');
    expect(source).toContain('expiredAtVerification');
    expect(source).toContain("code: code || 'unknown'");
  });

  it('does not add token previews, uid, email, or claim logging', () => {
    const diagnosticStart = source.indexOf(
      "event: 'opsiqo_firebase_id_token_verify_failed'",
    );

    expect(diagnosticStart).toBeGreaterThan(-1);

    const diagnosticWindow = source.slice(
      Math.max(0, diagnosticStart - 400),
      diagnosticStart + 900,
    );

    expect(diagnosticWindow).not.toContain('tokenPreview');
    expect(diagnosticWindow).not.toContain('decoded.uid');
    expect(diagnosticWindow).not.toContain('decoded.email');
    expect(diagnosticWindow).not.toContain('payload.aud,');
    expect(diagnosticWindow).not.toContain('payload.iss,');
  });

  it('preserves the existing invalid-token denial behavior', () => {
    expect(source).toContain("'invalid_auth_token'");
    expect(source).toContain("'auth/id-token-expired'");
    expect(source).toContain("'auth/id-token-revoked'");
    expect(source).toContain("'auth/invalid-id-token'");
  });
});