'use client';

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { activeOrgId, apiFetch } from '@/lib/http/client';

type Invitation = {
  id: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  experience?: 'standard' | 'pulse';
  createdAt: string;
  expiresAt: string;
  lastDeliveryAt?: string;
  deliveryStatus?: 'email' | 'manual' | 'failed';
  openedAt?: string;
  lastOpenedAt?: string;
  openCount?: number;
  acceptedAt?: string;
  appActivatedAt?: string;
  mfaCompletedAt?: string;
  firstMobileLoginAt?: string;
  firstClockInAt?: string;
};

type Access = {
  workerId: string;
  email: string;
  status: string;
  membership: { role: string; status: string } | null;
  invitation: Invitation | null;
  downloadUrl: string;
  pulse: {
    appName: string;
    iosUrl: string | null;
    androidUrl: string | null;
  };
};

type InvitationResponse = {
  invitation: Invitation;
  delivery: 'email' | 'manual';
  deliveryError?: string;
  inviteUrl?: string;
};

function LifecycleItem({
  label,
  at,
  pendingText = 'Pending',
}: {
  label: string;
  at?: string;
  pendingText?: string;
}) {
  return (
    <div>
      <div className="metricLabel">{label}</div>
      <strong>{at ? new Date(at).toLocaleString() : pendingText}</strong>
    </div>
  );
}

export function PulseInvitationPanel({
  workerId,
  workEmail,
  canInvite,
}: {
  workerId: string;
  workEmail?: string;
  canInvite: boolean;
}) {
  const [access, setAccess] = useState<Access | null>(null);
  const [inviteEmail, setInviteEmail] = useState(workEmail || '');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [secureLink, setSecureLink] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [showQr, setShowQr] = useState(false);

  const load = async () => {
    try {
      const result = await apiFetch<{ data: Access }>(
        `/api/organizations/${activeOrgId()}/employees/${workerId}/access`,
      );
      setAccess(result.data);
      if (workEmail) setInviteEmail(workEmail);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load OPSIQO Pulse invitation status.');
    }
  };

  useEffect(() => {
    void load();
  }, [workerId]);

  const pending = access?.invitation?.status === 'pending';
  const role = access?.membership?.role || 'employee';

  const distribution = useMemo(() => ({
    ios: access?.pulse?.iosUrl || access?.downloadUrl || '/download-app',
    android: access?.pulse?.androidUrl || access?.downloadUrl || '/download-app',
  }), [access]);

  async function prepareShareArtifacts(url: string) {
    setSecureLink(url);
    setQrDataUrl(await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 280,
    }));
  }

  async function sendOrResend() {
    const email = String(inviteEmail || '').trim().toLowerCase();
    if (!email) {
      setError('Enter the employee invitation email before sending OPSIQO Pulse access.');
      return;
    }

    setBusy('send');
    setError('');
    setMessage('');
    setSecureLink('');
    setQrDataUrl('');
    setShowQr(false);

    try {
      let result: { data: InvitationResponse };

      if (pending && access?.invitation?.id) {
        result = await apiFetch(
          `/api/organizations/${activeOrgId()}/invitations/${access.invitation.id}`,
          {
            method: 'POST',
            body: JSON.stringify({
              action: 'resend',
              expiresInDays: 7,
              experience: 'pulse',
            }),
          },
        );
      } else {
        result = await apiFetch(
          `/api/organizations/${activeOrgId()}/invitations`,
          {
            method: 'POST',
            body: JSON.stringify({
              email,
              role,
              workerId,
              expiresInDays: 7,
              experience: 'pulse',
            }),
          },
        );
      }

      if (result.data.inviteUrl) {
        await prepareShareArtifacts(result.data.inviteUrl);
      }

      setMessage(
        result.data.delivery === 'email'
          ? 'OPSIQO Pulse invitation sent. The secure link expires in 7 days.'
          : 'OPSIQO Pulse invitation created. Email delivery is not configured; copy the secure link or show the QR code now.',
      );
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to send OPSIQO Pulse invitation.');
    } finally {
      setBusy('');
    }
  }

  async function revoke() {
    if (!access?.invitation?.id || access.invitation.status !== 'pending') return;
    setBusy('revoke');
    setError('');
    setMessage('');
    try {
      await apiFetch(
        `/api/organizations/${activeOrgId()}/invitations/${access.invitation.id}`,
        {
          method: 'POST',
          body: JSON.stringify({
            action: 'revoke',
            reason: 'OPSIQO Pulse invitation revoked from employee profile',
          }),
        },
      );
      setSecureLink('');
      setQrDataUrl('');
      setShowQr(false);
      setMessage('Pending OPSIQO Pulse invitation revoked.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to revoke OPSIQO Pulse invitation.');
    } finally {
      setBusy('');
    }
  }

  async function copySecureLink() {
    if (!secureLink) return;
    try {
      await navigator.clipboard.writeText(secureLink);
      setMessage('Secure invitation link copied. Treat it like a temporary credential and share it only with the intended employee.');
    } catch {
      setError('Browser clipboard access was not available. Use the QR code instead.');
    }
  }

  const invitation = access?.invitation;

  return (
    <section className="card stack">
      <div className="toolbar">
        <div>
          <h2 className="sectionTitle">OPSIQO Pulse invitation</h2>
          <div className="muted">
            Secure mobile onboarding from the employee record. OPSIQO stores only the token hash; the raw one-time link is available only immediately after send/resend.
          </div>
        </div>
        {invitation && <span className="badge">{invitation.status}</span>}
      </div>

      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      <div className="grid4">
        <div>
          <div className="metricLabel">Organization app</div>
          <strong>OPSIQO Pulse</strong>
        </div>
        <div>
          <div className="metricLabel">Account role</div>
          <strong>{role.replaceAll('_', ' ')}</strong>
        </div>
        <div>
          <div className="metricLabel">iPhone</div>
          <a className="textLink" href={distribution.ios} target="_blank" rel="noreferrer">
            {access?.pulse?.iosUrl ? 'Configured link' : 'Download instructions'}
          </a>
        </div>
        <div>
          <div className="metricLabel">Android</div>
          <a className="textLink" href={distribution.android} target="_blank" rel="noreferrer">
            {access?.pulse?.androidUrl ? 'Configured link' : 'Download instructions'}
          </a>
        </div>
      </div>

      {canInvite ? (
        <div className="row wrap">
          <label className="field" style={{ minWidth: 280 }}>
            <span>Employee invitation email</span>
            <input
              className="input"
              type="email"
              value={inviteEmail}
              readOnly={Boolean(workEmail)}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="employee@company.ca"
            />
          </label>

          <button className="button" disabled={Boolean(busy)} onClick={() => void sendOrResend()}>
            {busy === 'send'
              ? 'Sendingâ€¦'
              : pending
                ? 'Resend OPSIQO Pulse invitation'
                : 'Send OPSIQO Pulse invitation'}
          </button>

          {pending && (
            <button className="button dangerButton" disabled={Boolean(busy)} onClick={() => void revoke()}>
              {busy === 'revoke' ? 'Revokingâ€¦' : 'Revoke invitation'}
            </button>
          )}
        </div>
      ) : (
        <div className="notice">Your current role can view this employee but cannot send organization invitations.</div>
      )}

      {secureLink && (
        <div className="card stack">
          <div className="notice">
            This secure link contains the raw single-use invitation token. OPSIQO does not persist it. Copy or display it now; resending rotates the token.
          </div>
          <div className="row wrap">
            <button className="button secondary" onClick={() => void copySecureLink()}>
              Copy secure link
            </button>
            <button className="button secondary" onClick={() => setShowQr((value) => !value)}>
              {showQr ? 'Hide QR code' : 'Show QR code'}
            </button>
          </div>
          {showQr && qrDataUrl && (
            <div>
              <img
                src={qrDataUrl}
                width={280}
                height={280}
                alt="QR code for the current OPSIQO Pulse employee invitation"
              />
            </div>
          )}
        </div>
      )}

      {invitation ? (
        <div className="stack">
          <h3 className="sectionTitle">Activation status</h3>
          <div className="grid4">
            <LifecycleItem label="Invitation created" at={invitation.createdAt} />
            <LifecycleItem
              label="Sent"
              at={invitation.deliveryStatus === 'email' ? invitation.lastDeliveryAt : undefined}
              pendingText={invitation.deliveryStatus === 'manual' ? 'Ready to share' : 'Pending'}
            />
            <LifecycleItem label="Opened" at={invitation.openedAt} />
            <LifecycleItem label="Accepted" at={invitation.acceptedAt} />
            <LifecycleItem label="App activated" at={invitation.appActivatedAt} />
            <LifecycleItem label="MFA completed" at={invitation.mfaCompletedAt} />
            <LifecycleItem label="First mobile login" at={invitation.firstMobileLoginAt} />
            <LifecycleItem label="First clock-in" at={invitation.firstClockInAt} />
          </div>
        </div>
      ) : (
        <div className="muted">No OPSIQO Pulse invitation has been created for this employee yet.</div>
      )}
    </section>
  );
}