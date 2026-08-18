import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { ApiRequestError, apiRequestErrorFromPayload, isMfaRequiredError } from '@/lib/http/api-request-error';
import { mfaSetupHref, sanitizeInternalReturnTo } from '@/lib/auth/mfa-client';

describe('OPSIQO 8.5 V7.9.3.3 governed MFA hotfix', () => {
  it('preserves structured mfa_required API errors', () => {
    const error = apiRequestErrorFromPayload(403, {
      error: 'mfa_required',
      message: 'Multi-factor authentication is required for privileged HR access.',
      issues: [{ path: 'actor', message: 'MFA required' }],
    }, 'fallback');
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error.status).toBe(403);
    expect(error.code).toBe('mfa_required');
    expect(error.message).toContain('Multi-factor authentication');
    expect(error.details).toEqual([{ path: 'actor', message: 'MFA required' }]);
    expect(isMfaRequiredError(error)).toBe(true);
  });

  it('keeps ordinary non-MFA API failures ordinary structured errors', () => {
    const error = apiRequestErrorFromPayload(403, { error: 'forbidden', message: 'Permission required.' }, 'fallback');
    expect(error.status).toBe(403);
    expect(error.code).toBe('forbidden');
    expect(error.message).toBe('Permission required.');
    expect(isMfaRequiredError(error)).toBe(false);
  });

  it('rejects unsafe return destinations and preserves safe internal paths', () => {
    expect(sanitizeInternalReturnTo('/settings?tab=security', '/dashboard')).toBe('/settings?tab=security');
    expect(sanitizeInternalReturnTo('https://evil.example/phish', '/dashboard')).toBe('/dashboard');
    expect(sanitizeInternalReturnTo('//evil.example/phish', '/dashboard')).toBe('/dashboard');
    expect(sanitizeInternalReturnTo('/\\evil.example', '/dashboard')).toBe('/dashboard');
    expect(mfaSetupHref('/home')).toBe('/mfa/setup?returnTo=%2Fhome');
  });

  it('makes Settings terminate in a governed MFA state instead of endless loading', () => {
    const source = fs.readFileSync('src/components/settings-workspace.tsx', 'utf8');
    expect(source).toContain("isMfaRequiredError(e)");
    expect(source).toContain('setMe(null);setPlatform(null);setNotifications(null);setMfaRequired(true)');
    expect(source).toContain('data-security-state="mfa-required"');
    expect(source).toContain('Set up multi-factor authentication');
    expect(source.indexOf('data-security-state="mfa-required"')).toBeLessThan(source.indexOf('Loading account and platform settings…'));
  });

  it('withholds My OPSIQO dashboard data when MFA is required', () => {
    const source = fs.readFileSync('src/components/superapp-workspace.tsx', 'utf8');
    expect(source).toContain("if(isMfaRequiredError(e)){setD(null);setMfaRequired(true)");
    expect(source).toContain('My OPSIQO data is intentionally withheld');
    expect(source).toContain('data-security-state="mfa-required"');
    expect(source).not.toContain("catch{setError(T.loadError)}");
  });

  it('implements Firebase TOTP enrollment with verified email and fresh authentication controls', () => {
    const source = fs.readFileSync('src/app/mfa/setup/page.tsx', 'utf8');
    expect(source).toContain('multiFactor(user).getSession()');
    expect(source).toContain('TotpMultiFactorGenerator.generateSecret(session)');
    expect(source).toContain('secret.generateQrCodeUrl');
    expect(source).toContain('secret.secretKey');
    expect(source).toContain('TotpMultiFactorGenerator.assertionForEnrollment(secret, code)');
    expect(source).toContain('multiFactor(user).enroll(assertion');
    expect(source).toContain('reauthenticateWithCredential(user, credential)');
    expect(source).toContain('user.getIdToken(true)');
    expect(source).toContain('setSecret(null)');
    expect(source).not.toMatch(/console\.(log|info|warn|error).*secret/i);
    expect(source).not.toMatch(/console\.(log|info|warn|error).*otp/i);
  });

  it('handles auth/multi-factor-auth-required using a TOTP resolver and fail-closed factor selection', () => {
    const source = fs.readFileSync('src/app/signin/page.tsx', 'utf8');
    expect(source).toContain('getMultiFactorResolver(firebaseAuth()');
    expect(source).toContain('TotpMultiFactorGenerator.FACTOR_ID');
    expect(source).toContain('TotpMultiFactorGenerator.assertionForSignIn(hint.uid,code)');
    expect(source).toContain('mfaResolver.resolveSignIn(assertion)');
    expect(source).toContain('does not support. Contact your administrator.');
    expect(source).not.toContain('downgrade');
  });

  it('keeps MFA setup in the security-focused bootstrap shell', () => {
    const shell = fs.readFileSync('src/components/app-shell.tsx', 'utf8');
    expect(shell).toContain("'/mfa/setup'");
  });
});
