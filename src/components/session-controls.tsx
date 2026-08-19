'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase/client';
import { clearActiveOrgId } from '@/lib/http/client';

type SessionControlsProps = {
  compact?: boolean;
  label?: string;
};

export function SessionControls({
  compact = false,
  label = 'Sign out / use another account',
}: SessionControlsProps) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth(), (user) => {
      setEmail(user?.email || '');
    });
  }, []);

  async function handleSignOut() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      clearActiveOrgId();
      await signOut(firebaseAuth());
      if (typeof window !== 'undefined') {
        window.location.replace('/signin');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sign out.');
      setBusy(false);
    }
  }

  if (!email) return null;

  return (
    <div className={`sessionControls ${compact ? 'compact' : ''}`}>
      {!compact && (
        <div className="sessionIdentity">
          <span>Signed in as</span>
          <strong title={email}>{email}</strong>
        </div>
      )}
      <button
        type="button"
        className="sessionSignOut"
        onClick={() => void handleSignOut()}
        disabled={busy}
        aria-label={busy ? 'Signing out' : label}
      >
        <span aria-hidden="true">⇥</span>
        {!compact && <span>{busy ? 'Signing out…' : label}</span>}
      </button>
      {error && !compact && <small className="error" role="alert">{error}</small>}
    </div>
  );
}
