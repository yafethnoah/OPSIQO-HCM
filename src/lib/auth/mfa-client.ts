export function sanitizeInternalReturnTo(value: string | null | undefined, fallback = '/dashboard'): string {
  const candidate = String(value || '').trim();
  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) return fallback;
  try {
    const parsed = new URL(candidate, 'https://opsiqo.invalid');
    if (parsed.origin !== 'https://opsiqo.invalid') return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function mfaSetupHref(returnTo: string | null | undefined): string {
  const safe = sanitizeInternalReturnTo(returnTo, '/dashboard');
  return `/mfa/setup?returnTo=${encodeURIComponent(safe)}`;
}

export function isFirebaseMfaRequiredError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === 'auth/multi-factor-auth-required');
}

export function friendlyTotpError(error: unknown, fallback: string): string {
  const code = error && typeof error === 'object' && 'code' in error ? String((error as { code?: unknown }).code || '') : '';
  if (code === 'auth/invalid-verification-code' || code === 'auth/invalid-verification-id') return 'The authenticator code is invalid or expired. Wait for a new code and try again.';
  if (code === 'auth/code-expired') return 'The authenticator code expired. Enter the newest code from your authenticator app.';
  if (code === 'auth/requires-recent-login' || code === 'auth/user-token-expired') return 'For security, sign in again and then restart multi-factor setup.';
  if (code === 'auth/too-many-requests') return 'Too many attempts were detected. Wait and try again later.';
  return error instanceof Error ? error.message : fallback;
}
