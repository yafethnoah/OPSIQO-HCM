'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch, setActiveOrgId } from '@/lib/http/client';

const STORAGE_KEY = 'opsiqo.pulse.invitation';

type Preview = {
  appName: string;
  organizationName: string;
  role: string;
  status: string;
  expiresAt: string;
  workerMatched: boolean;
  iosUrl: string;
  iosDirect: boolean;
  androidUrl: string;
  androidDirect: boolean;
  supportEmail: string | null;
};

type StoredInvite = {
  orgId: string;
  token: string;
  preview?: Preview;
};

function readFragment(): StoredInvite | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const orgId = String(params.get('orgId') || '').trim();
  const token = String(params.get('token') || '').trim();
  return orgId && token ? { orgId, token } : null;
}

function readStored(): StoredInvite | null {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null') as StoredInvite | null;
    return parsed?.orgId && parsed?.token ? parsed : null;
  } catch {
    return null;
  }
}

export function PulseInviteLanding() {
  const [invite, setInvite] = useState<StoredInvite | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fromFragment = readFragment();
    const current = fromFragment || readStored();

    if (!current) {
      setError('This OPSIQO Pulse invitation is incomplete or no longer available in this browser session.');
      setLoading(false);
      return;
    }

    if (fromFragment) {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fromFragment));
      window.history.replaceState(null, '', '/invite');
    }

    setInvite(current);

    void (async () => {
      try {
        const response = await fetch('/api/mobile-invitations/resolve', {
          method: 'POST',
          cache: 'no-store',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(current),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            typeof payload?.error?.message === 'string'
              ? payload.error.message
              : 'Invitation is invalid or expired.',
          );
        }

        const resolved = payload.data as Preview;
        setPreview(resolved);
        window.sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...current, preview: resolved }),
        );
      } catch (cause) {
        // Existing OPSIQO access reconciliation may atomically accept the
        // invitation as soon as the correctly matched employee signs in.
        // In that case the one-time token index is already deleted, which is
        // expected. Confirm authenticated org access rather than treating the
        // consumed token as a broken invitation.
        try {
          setActiveOrgId(current.orgId);
          await apiFetch('/api/me');
          if (current.preview) setPreview(current.preview);
          setAccepted(true);
          window.sessionStorage.removeItem(STORAGE_KEY);
          setError('');
        } catch {
          setError(cause instanceof Error ? cause.message : 'Unable to open OPSIQO Pulse invitation.');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signInHref = useMemo(
    () => `/signin?returnTo=${encodeURIComponent('/invite')}`,
    [],
  );

  async function accept() {
    if (!invite) return;
    setError('');
    setAccepting(true);
    try {
      setActiveOrgId(invite.orgId);
      await apiFetch(`/api/organizations/${encodeURIComponent(invite.orgId)}/invitations/accept`, {
        method: 'POST',
        body: JSON.stringify({ token: invite.token }),
      });
      window.sessionStorage.removeItem(STORAGE_KEY);
      setAccepted(true);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to accept invitation.';
      setError(
        message === 'Sign in required.'
          ? 'Sign in with the email address that received this invitation, then return here to accept it.'
          : message,
      );
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return <div className="card"><span className="muted">Opening secure OPSIQO Pulse invitationâ€¦</span></div>;
  }

  if (accepted && preview) {
    return (
      <div className="card stack narrowCard">
        <div className="success">
          Invitation accepted. {preview.organizationName} is now linked to your OPSIQO account.
        </div>
        <div className="notice">
          Complete MFA if prompted, allow the permissions required by your organization, then open OPSIQO Pulse and use Home â†’ Clock In.
        </div>
        <Link className="button" href="/home">Open My OPSIQO</Link>
        <Link className="button secondary" href="/download-app">Open mobile app download page</Link>
      </div>
    );
  }

  return (
    <div className="stack">
      {error && <div className="error">{error}</div>}

      {preview && (
        <>
          <div className="grid2">
            <section className="card stack">
              <div>
                <div className="metricLabel">Organization</div>
                <h2 className="sectionTitle">{preview.organizationName}</h2>
              </div>
              <div className="definitionGrid">
                <span>App</span><strong>{preview.appName}</strong>
                <span>Invitation</span><strong>Valid</strong>
                <span>Employee</span><strong>{preview.workerMatched ? 'Matched' : 'Email-matched on acceptance'}</strong>
                <span>Role</span><strong>{preview.role.replaceAll('_', ' ')}</strong>
                <span>Expires</span><strong>{new Date(preview.expiresAt).toLocaleString()}</strong>
              </div>
            </section>

            <section className="card stack">
              <h2 className="sectionTitle">1. Install OPSIQO Pulse</h2>
              <a className="button" href={preview.iosUrl}>
                {preview.iosDirect ? 'Install on iPhone / iPad' : 'Open iOS download instructions'}
              </a>
              <a className="button secondary" href={preview.androidUrl}>
                {preview.androidDirect ? 'Install on Android' : 'Open Android download instructions'}
              </a>
            </section>
          </div>

          <section className="card stack">
            <h2 className="sectionTitle">2. Activate your organization access</h2>
            <div className="notice">
              Sign in using the email address that received this invitation. OPSIQO never sends your password in this invitation.
            </div>
            <div className="row wrap">
              <Link className="button secondary" href={signInHref}>Sign in first</Link>
              <button className="button" disabled={accepting} onClick={() => void accept()}>
                {accepting ? 'Acceptingâ€¦' : 'Accept organization invitation'}
              </button>
            </div>
          </section>

          <section className="card stack">
            <h2 className="sectionTitle">3. Finish OPSIQO Pulse setup</h2>
            <ol>
              <li>Complete multi-factor verification when prompted.</li>
              <li>Allow organization-required notifications, attendance/location and supported device-authentication permissions.</li>
              <li>Open Home in OPSIQO Pulse.</li>
              <li>Use Clock In â†’ Break when applicable â†’ Clock Out.</li>
            </ol>
            <div className="muted">
              {preview.supportEmail
                ? <>Need help? Contact <a href={`mailto:${preview.supportEmail}`}>{preview.supportEmail}</a>.</>
                : 'Need help? Contact your organization HR or OPSIQO administrator.'}
            </div>
          </section>
        </>
      )}
    </div>
  );
}