export type FirebaseAuthContext = 'signin' | 'password_reset' | 'guest' | 'sso';

function codeOf(error: unknown): string {
  if (!error || typeof error !== 'object' || !('code' in error)) return '';
  return String((error as { code?: unknown }).code || '');
}

export function friendlyFirebaseAuthError(
  error: unknown,
  context: FirebaseAuthContext,
  fallback: string,
): string {
  const code = codeOf(error);

  if (
    code === 'auth/user-not-found' ||
    code === 'auth/wrong-password' ||
    code === 'auth/invalid-credential' ||
    code === 'auth/invalid-login-credentials'
  ) {
    return context === 'password_reset'
      ? 'If this account is eligible for self-service recovery, password-reset instructions will be sent.'
      : 'The email or password could not be verified.';
  }

  if (code === 'auth/network-request-failed') {
    return 'We could not connect to the account service. Check your connection and try again.';
  }

  if (code === 'auth/too-many-requests') {
    return 'Too many attempts were detected. Wait a few minutes and try again.';
  }

  if (code === 'auth/user-disabled') {
    return 'This account is not currently permitted to sign in. Contact your organization administrator.';
  }

  if (code === 'auth/operation-not-allowed') {
    return 'This sign-in method is not enabled for the organization. Contact your administrator.';
  }

  if (code === 'auth/unauthorized-domain') {
    return 'This site is not authorized for account access. Contact your administrator.';
  }

  if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user') {
    return 'The identity-provider window did not complete. Allow the sign-in window and try again.';
  }

  return error instanceof Error && error.message && !error.message.startsWith('Firebase: Error')
    ? error.message
    : fallback;
}
