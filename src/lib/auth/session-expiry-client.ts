'use client';

import { useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase/client';
import { clearActiveOrgId } from '@/lib/http/client';

const SESSION_EXPIRY_REDIRECT_KEY = 'opsiqo.sessionExpiryRedirecting';
let redirectingForExpiredSession = false;

export function useSessionExpiryRedirect(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const onSessionExpired = () => {
      if (redirectingForExpiredSession) return;
      redirectingForExpiredSession = true;
      try { window.sessionStorage.setItem(SESSION_EXPIRY_REDIRECT_KEY, '1'); } catch { /* storage may be unavailable */ }

      const returnTo = `${window.location.pathname}${window.location.search}`;
      clearActiveOrgId();

      void signOut(firebaseAuth())
        .catch(() => undefined)
        .finally(() => {
          const target = `/signin?reason=session_expired&returnTo=${encodeURIComponent(returnTo)}`;
          window.location.assign(target);
        });
    };

    window.addEventListener('opsiqo:session-expired', onSessionExpired);
    return () => window.removeEventListener('opsiqo:session-expired', onSessionExpired);
  }, [enabled]);
}
