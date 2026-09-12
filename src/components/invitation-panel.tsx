'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { activeOrgId, apiFetch } from '@/lib/http/client';
import { useLegacySurfaceTranslation } from '@/lib/opsiqo-one/legacy-surface-i18n';

type Invitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  accountStatus?: string;
  deliveryStatus?: string;
  deliveryError?: string;
  expiresAt: string;
  createdAt: string;
  lastSentAt?: string;
  lastDeliveryAt?: string;
  sendCount?: number;
  workerId?: string;
};
type Worker = { id: string; displayName: string; workEmail: string };
type InviteResponse = {
  delivery: string;
  inviteUrl?: string;
  passwordSetupUrl?: string;
  downloadUrl?: string;
  signInUrl?: string;
  timeLeaveUrl?: string;
  invitation: Invitation;
  deliveryError?: string;
  authIdentity?: string;
};

export function InvitationPanel() {
  const translationRoot = useRef<HTMLDivElement>(null);
  useLegacySurfaceTranslation('invitations', translationRoot);
  const [data, setData] = useState<Invitation[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [email, setEmail] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [error, setError] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [passwordLink, setPasswordLink] = useState('');
  const [downloadLink, setDownloadLink] = useState('');
  const [timeLeaveLink, setTimeLeaveLink] = useState('');
  const [delivery, setDelivery] = useState('');
  const [busy, setBusy] = useState('');

  const load = async () => {
    try {
      const [i, w] = await Promise.all([
        apiFetch<{ data: Invitation[] }>(`/api/organizations/${activeOrgId()}/invitations`),
        apiFetch<{ data: Worker[] }>(`/api/organizations/${activeOrgId()}/employees`),
      ]);
      setData(i.data);
      setWorkers(w.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load invitations.');
    }
  };

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener('opsiqo:employees-imported', refresh);
    window.addEventListener('opsiqo:organization-changed', refresh);
    return () => {
      window.removeEventListener('opsiqo:employees-imported', refresh);
      window.removeEventListener('opsiqo:organization-changed', refresh);
    };
  }, []);

  const linked = workers.find((worker) => worker.id === workerId);
  const mismatch = Boolean(linked?.workEmail && email && linked.workEmail.toLowerCase() !== email.trim().toLowerCase());

  function applyResponse(response: InviteResponse) {
    setInviteLink(response.delivery === 'manual' ? response.inviteUrl || '' : '');
    setPasswordLink(response.delivery === 'manual' ? response.passwordSetupUrl || '' : '');
    setDownloadLink(response.downloadUrl || '');
    setTimeLeaveLink(response.timeLeaveUrl || response.signInUrl || '');
    if (response.delivery === 'email') {
      setDelivery(`Invitation email delivered. Firebase identity ${response.authIdentity || 'prepared'}; organization access is already provisioned and activates automatically on first authenticated sign-in.`);
    } else {
      setDelivery(response.deliveryError
        ? `Email delivery was unavailable (${response.deliveryError}). Use the secure setup links below for manual delivery.`
        : 'Email delivery is not configured. Use the secure setup links below for manual delivery.');
    }
  }

  async function invite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (mismatch) return setError('The invitation email must match the selected worker work email.');
    setError('');
    setInviteLink('');
    setPasswordLink('');
    setDownloadLink('');
    setTimeLeaveLink('');
    setDelivery('');
    setBusy('create');
    const form = new FormData(e.currentTarget);
    try {
      const result = await apiFetch<{ data: InviteResponse }>(`/api/organizations/${activeOrgId()}/invitations`, {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          role: form.get('role'),
          workerId: workerId || undefined,
          expiresInDays: Number(form.get('expiresInDays') || 7),
        }),
      });
      applyResponse(result.data);
      setEmail('');
      setWorkerId('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to create invitation.');
    } finally {
      setBusy('');
    }
  }

  async function action(invitation: Invitation, actionName: 'resend' | 'revoke') {
    setError('');
    setInviteLink('');
    setPasswordLink('');
    setTimeLeaveLink('');
    setDelivery('');
    setBusy(`${invitation.id}:${actionName}`);
    try {
      const payload = actionName === 'resend'
        ? { action: 'resend', expiresInDays: 7 }
        : { action: 'revoke', reason: 'Revoked by administrator' };
      const result = await apiFetch<{ data: InviteResponse }>(`/api/organizations/${activeOrgId()}/invitations/${invitation.id}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (actionName === 'resend') applyResponse(result.data);
      else setDelivery('Invitation revoked. If OPSIQO provisioned access for this pending invitation, the organization membership was also deactivated.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : `Unable to ${actionName} invitation.`);
    } finally {
      setBusy('');
    }
  }

  async function copy(value: string, label: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setDelivery(`${label} copied. Share it only with the intended recipient.`);
    } catch {
      setError('Clipboard access is unavailable. Copy the link manually.');
    }
  }

  return <div ref={translationRoot} className="stack">
    <div className="grid2">
      <form className="card stack" onSubmit={invite}>
        <div>
          <div className="toolbar"><h2 className="sectionTitle">Invite employee to OPSIQO</h2><a className="textLink" href="/settings/mobile-invitations">Edit invitation & app links</a></div>
          <div className="muted">The platform creates or reuses the Firebase identity, provisions organization membership, generates password setup, and sends the branded access email.</div>
        </div>
        <label className="field"><span>Email</span><input required type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="field"><span>Role</span><select className="input" name="role" defaultValue="employee"><option value="employee">Employee</option><option value="manager">Manager</option><option value="hr_partner">HR Partner</option><option value="hr_admin">HR Admin</option><option value="org_admin">Organization Admin</option></select></label>
        <label className="field"><span>Link to employee</span><select className="input" value={workerId} onChange={(e) => { const id = e.target.value; setWorkerId(id); const worker = workers.find((item) => item.id === id); if (worker?.workEmail) setEmail(worker.workEmail); }}><option value="">Match automatically by work email</option>{workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.displayName} · {worker.workEmail}</option>)}</select></label>
        {mismatch && <div className="error">Selected employee email is {linked?.workEmail}. Correct the invitation email before sending.</div>}
        <label className="field"><span>Invitation validity (days)</span><input className="input" type="number" min="1" max="30" defaultValue="7" name="expiresInDays" /></label>
        <button className="button" disabled={busy === 'create' || mismatch}>{busy === 'create' ? 'Provisioning…' : 'Provision access & send invitation'}</button>
      </form>

      <div className="card stack">
        <h2 className="sectionTitle">H48 account lifecycle</h2>
        <div className="securityChecklist">
          <div>✓ Firebase identity create-or-reuse</div>
          <div>✓ Employee email validated server-side</div>
          <div>✓ Organization membership provisioned automatically</div>
          <div>✓ Employee sets their own password</div>
          <div>✓ No password is emailed or stored by HR</div>
          <div>✓ First authenticated sign-in finalizes invitation status</div>
          <div>✓ App download landing page is centrally controlled</div>
          <div>✓ Resend rotates secure invitation token</div>
          <div>✓ Revoke removes pending provisioned access</div>
          <div>✓ All provisioning actions are audited</div>
        </div>
        {delivery && <div className="notice">{delivery}</div>}
        {passwordLink && <div><div className="metricLabel">Password setup link</div><div className="copyBox">{passwordLink}</div><button className="button secondary compact" onClick={() => copy(passwordLink, 'Password setup link')}>Copy password setup link</button></div>}
        {inviteLink && <div><div className="metricLabel">Secure invitation link</div><div className="copyBox">{inviteLink}</div><button className="button secondary compact" onClick={() => copy(inviteLink, 'Invitation link')}>Copy invitation link</button></div>}
        {downloadLink && <div><div className="metricLabel">App download landing page</div><div className="copyBox">{downloadLink}</div><button className="button secondary compact" onClick={() => copy(downloadLink, 'App download link')}>Copy download link</button></div>}{timeLeaveLink && <div><div className="metricLabel">Time & Leave access</div><div className="copyBox">{timeLeaveLink}</div><button className="button secondary compact" onClick={() => copy(timeLeaveLink, 'Time & Leave link')}>Copy Time & Leave link</button></div>}
      </div>
    </div>

    {error && <div className="error">{error}</div>}

    <section className="card tableWrap">
      <h2 className="sectionTitle">Invitation & activation lifecycle</h2>
      <table>
        <thead><tr><th>Email</th><th>Role</th><th>Account</th><th>Delivery</th><th>Expires</th><th>Sends</th><th>Invitation</th><th>Actions</th></tr></thead>
        <tbody>
          {data.map((invitation) => <tr key={invitation.id}>
            <td>{invitation.email}</td>
            <td>{invitation.role.replaceAll('_', ' ')}</td>
            <td><span className="badge">{invitation.accountStatus || 'not provisioned'}</span></td>
            <td><span className="badge">{invitation.deliveryStatus || 'not sent'}</span>{invitation.deliveryError && <div className="muted">{invitation.deliveryError}</div>}</td>
            <td>{new Date(invitation.expiresAt).toLocaleDateString()}</td>
            <td>{invitation.sendCount || 1}</td>
            <td><span className="badge">{invitation.status}</span></td>
            <td><div className="stepActions">{(invitation.status === 'pending' || invitation.status === 'expired') && <button className="button secondary" disabled={Boolean(busy)} onClick={() => action(invitation, 'resend')}>{busy === `${invitation.id}:resend` ? 'Sending…' : 'Resend'}</button>}{invitation.status === 'pending' && <button className="button dangerButton" disabled={Boolean(busy)} onClick={() => action(invitation, 'revoke')}>{busy === `${invitation.id}:revoke` ? 'Revoking…' : 'Revoke'}</button>}</div></td>
          </tr>)}
          {!data.length && <tr><td colSpan={8} className="muted">No invitations yet.</td></tr>}
        </tbody>
      </table>
    </section>
  </div>;
}
