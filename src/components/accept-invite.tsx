'use client';

import Link from 'next/link';
import { useState } from 'react';
import { apiFetch, setActiveOrgId } from '@/lib/http/client';
import { SessionControls } from '@/components/session-controls';

function landingForRole(role:string){if(role==='employee')return'/employee';if(role==='manager')return'/manager';return'/dashboard'}

export function AcceptInvite({orgId,token}:{orgId:string;token:string}){
  const [status,setStatus] = useState('');
  const [error,setError] = useState('');
  const [landing,setLanding] = useState('/home');
  const [busy,setBusy] = useState(false);
  const [accepted,setAccepted] = useState(false);

  async function accept(){
    if (busy || accepted) return;
    let invitationAccepted = false;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const result = await apiFetch<{data:{role:string}}>(`/api/organizations/${encodeURIComponent(orgId)}/invitations/accept`, {
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({token}),
      });
      invitationAccepted = true;
      setAccepted(true);
      setStatus('Invitation accepted. Activating the new organization…');

      const activated = await apiFetch<{data:{orgId:string;role:string}}>('/api/me/organizations/activate', {
        method: 'POST',
        orgContext: 'omit',
        body: JSON.stringify({ orgId, reason: 'invitation_accept' }),
      });

      setActiveOrgId(activated.data.orgId);
      setLanding(landingForRole(result.data.role));
      setStatus('Invitation accepted. Your existing organization memberships were preserved and this organization is now active.');
    } catch(e) {
      if (invitationAccepted) {
        setError('The invitation was accepted, but organization activation did not finish. Reload the app and choose the organization from the switcher.');
      } else {
        setError(e instanceof Error?e.message:'Unable to accept invitation.');
      }
    } finally {
      setBusy(false);
    }
  }

  return <div className="card stack narrowCard">
    <SessionControls label="Sign out / use a different account" />
    <div className="notice">For security, the signed-in Firebase account email must exactly match the email that received this invitation. Accepting a new invitation adds or reactivates only that organization membership; it does not replace memberships in other organizations.</div>
    {error&&<div className="error">{error}</div>}
    {status&&<div className="success">{status}</div>}
    <button className="button" disabled={busy||accepted} onClick={accept}>{busy?'Processing…':accepted?'Invitation accepted':'Accept invitation'}</button>
    {!accepted&&<Link className="textLink" href={`/signin?returnTo=${encodeURIComponent(`/accept-invite?orgId=${orgId}&token=${token}`)}`}>Sign in first →</Link>}
    {accepted&&<Link className="textLink" href={landing}>{landing==='/employee'?'Open Employee Portal →':landing==='/manager'?'Open Manager Self-Service →':'Open organization dashboard →'}</Link>}
  </div>;
}
