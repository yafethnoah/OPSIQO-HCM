'use client';

import Link from 'next/link';
import { useState } from 'react';
import { apiFetch, setActiveOrgId } from '@/lib/http/client';

function landingForRole(role:string){if(role==='employee')return'/employee';if(role==='manager')return'/manager';return'/dashboard'}

export function AcceptInvite({orgId,token}:{orgId:string;token:string}){
  const[status,setStatus]=useState('');const[error,setError]=useState('');const[landing,setLanding]=useState('/home');
  async function accept(){setError('');setStatus('');try{const result=await apiFetch<{data:{role:string}}>(`/api/organizations/${encodeURIComponent(orgId)}/invitations/accept`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token})});setActiveOrgId(orgId);setLanding(landingForRole(result.data.role));setStatus('Invitation accepted. Your organization membership is now active.');}catch(e){setError(e instanceof Error?e.message:'Unable to accept invitation.');}}
  return <div className="card stack narrowCard"><div className="notice">For security, the signed-in Firebase account email must exactly match the email that received this invitation.</div>{error&&<div className="error">{error}</div>}{status&&<div className="success">{status}</div>}<button className="button" onClick={accept}>Accept invitation</button><Link className="textLink" href={`/signin?returnTo=${encodeURIComponent(`/accept-invite?orgId=${orgId}&token=${token}`)}`}>Sign in first →</Link>{status&&<Link className="textLink" href={landing}>{landing==='/employee'?'Open Employee Portal →':landing==='/manager'?'Open Manager Self-Service →':landing==='/home'?'Open My OPSIQO →':'Open organization dashboard →'}</Link>}</div>;
}
