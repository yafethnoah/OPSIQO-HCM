'use client';
import { FormEvent, useEffect, useState } from 'react';
import { activeOrgId, apiFetch } from '@/lib/http/client';
import { firebaseAppCheck, firebaseAuth } from '@/lib/firebase/client';
import { getToken as getAppCheckToken } from 'firebase/app-check';
type Audit = { id:string; action:string; entityType:string; entityId:string; actorUid:string; actorRole:string; createdAt:string };
export function AuditTable(){
  const [data,setData]=useState<Audit[]>([]); const [error,setError]=useState(''); const[query,setQuery]=useState('limit=100');
  const load=(q=query)=>apiFetch<{data:Audit[]}>(`/api/organizations/${activeOrgId()}/audit?${q}`).then(r=>setData(r.data)).catch(e=>setError(e.message));
  useEffect(()=>{load();},[]);
  function filter(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const p=new URLSearchParams({limit:'200'});for(const key of ['action','entityType','actorUid','from','to']){const v=String(f.get(key)||'');if(v)p.set(key,key==='from'?`${v}T00:00:00.000Z`:key==='to'?`${v}T23:59:59.999Z`:v);}const q=p.toString();setQuery(q);load(q);}
  async function exportCsv(){setError('');try{const headers=new Headers();headers.set('x-org-id',activeOrgId());if(process.env.NEXT_PUBLIC_OPSIQO_DEMO_MODE!=='true'){const user=firebaseAuth().currentUser;if(!user)throw new Error('Sign in required.');headers.set('authorization',`Bearer ${await user.getIdToken()}`);const appCheck=firebaseAppCheck();if(appCheck){const token=await getAppCheckToken(appCheck);headers.set('x-firebase-appcheck',token.token);}}const response=await fetch(`/api/organizations/${activeOrgId()}/audit/export?${query}`,{headers,cache:'no-store'});if(!response.ok){const payload=await response.json();throw new Error(payload?.message||'Export failed.');}const blob=await response.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`opsiqo-audit-${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}catch(e){setError(e instanceof Error?e.message:'Unable to export audit.');}}
  return <div className="stack">
    {error&&<div className="error">{error}</div>}
    <div className="notice">Audit records are server-written. Filters operate on authoritative audit evidence, and CSV export uses the same server authorization boundary.</div>
    <form className="card filterBar" onSubmit={filter}><input className="input" name="action" placeholder="Action contains…"/><input className="input" name="entityType" placeholder="Entity type"/><input className="input" name="actorUid" placeholder="Actor UID"/><input className="input" name="from" type="date"/><input className="input" name="to" type="date"/><button className="button">Filter</button><button className="button secondary" type="button" onClick={exportCsv}>Export CSV</button></form>
    <section className="card tableWrap"><table><thead><tr><th>Time</th><th>Action</th><th>Entity</th><th>Actor</th><th>Role</th></tr></thead><tbody>{data.map(a=><tr key={a.id}><td>{new Date(a.createdAt).toLocaleString()}</td><td><strong>{a.action}</strong></td><td>{a.entityType} · {a.entityId.slice(0,8)}</td><td>{a.actorUid}</td><td><span className="badge">{a.actorRole}</span></td></tr>)}{!data.length&&<tr><td colSpan={5} className="muted">No matching audit events.</td></tr>}</tbody></table></section>
  </div>;
}
