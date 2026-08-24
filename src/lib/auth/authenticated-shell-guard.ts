'use client';

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase/client';
import { clearActiveOrgId } from '@/lib/http/client';

const SESSION_EXPIRY_REDIRECT_KEY = 'opsiqo.sessionExpiryRedirecting';
let redirectingForMissingAuth = false;

export function useAuthenticatedShellGuard(enabled = true) {
  useEffect(() => {
    if (!enabled || process.env.NEXT_PUBLIC_OPSIQO_DEMO_MODE === 'true') return;

    let cancelled = false;
    const auth = firebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (cancelled) return;
      if (user) {
        try { window.sessionStorage.removeItem(SESSION_EXPIRY_REDIRECT_KEY); } catch { /* storage may be unavailable */ }
        return;
      }

      try {
        if (window.sessionStorage.getItem(SESSION_EXPIRY_REDIRECT_KEY) === '1') return;
      } catch { /* storage may be unavailable */ }

      if (redirectingForMissingAuth) return;
      redirectingForMissingAuth = true;
      clearActiveOrgId();
      const returnTo = `${window.location.pathname}${window.location.search}`;
      window.location.replace(`/signin?reason=authentication_required&returnTo=${encodeURIComponent(returnTo)}`);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [enabled]);
}
