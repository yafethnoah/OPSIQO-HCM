'use client';
import { FormEvent, useEffect, useState } from 'react';
import { activeOrgId, apiDownload, apiFetch } from '@/lib/http/client';
import { EmptyState, LoadingState } from '@/components/data-states';
type Audit = { id:string; action:string; entityType:string; entityId:string; actorUid:string; actorRole:string; createdAt:string };
export function AuditTable(){
  const [data,setData]=useState<Audit[]>([]); const [error,setError]=useState(''); const[query,setQuery]=useState('limit=100'); const[loading,setLoading]=useState(true);
  const load=async(q=query)=>{try{setLoading(true);setError('');const r=await apiFetch<{data:Audit[]}>(`/api/organizations/${activeOrgId()}/audit?${q}`);setData(r.data)}catch(e){setError(e instanceof Error?e.message:'Unable to load audit events.')}finally{setLoading(false)}};
  useEffect(()=>{load();const onOrg=()=>{setData([]);load();};window.addEventListener('opsiqo:organization-changed',onOrg);return()=>window.removeEventListener('opsiqo:organization-changed',onOrg);},[]);
  function filter(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const p=new URLSearchParams({limit:'200'});for(const key of ['action','entityType','actorUid','from','to']){const v=String(f.get(key)||'');if(v)p.set(key,key==='from'?`${v}T00:00:00.000Z`:key==='to'?`${v}T23:59:59.999Z`:v);}const q=p.toString();setQuery(q);load(q);}
  async function exportCsv(){setError('');try{const {blob,fileName}=await apiDownload(`/api/organizations/${activeOrgId()}/audit/export?${query}`);const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=fileName||`opsiqo-audit-${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}catch(e){setError(e instanceof Error?e.message:'Unable to export audit.')}}
  return <div className="stack">
    {error&&<div className="error">{error}</div>}
    <div className="notice">Audit records are server-written. Filters operate on authoritative audit evidence, and CSV export uses the same server authorization boundary.</div>
    <form className="card filterBar" onSubmit={filter}><input className="input" name="action" placeholder="Action contains…"/><input className="input" name="entityType" placeholder="Entity type"/><input className="input" name="actorUid" placeholder="Actor UID"/><input className="input" name="from" type="date"/><input className="input" name="to" type="date"/><button className="button">Filter</button><button className="button secondary" type="button" onClick={exportCsv}>Export CSV</button></form>
    {loading?<LoadingState label="Loading authoritative audit evidence…"/>:<section className="card tableWrap">{data.length?<table><thead><tr><th>Time</th><th>Action</th><th>Entity</th><th>Actor</th><th>Role</th></tr></thead><tbody>{data.map(a=><tr key={a.id}><td>{new Date(a.createdAt).toLocaleString()}</td><td><strong>{a.action}</strong></td><td>{a.entityType} · {a.entityId.slice(0,8)}</td><td>{a.actorUid}</td><td><span className="badge">{a.actorRole}</span></td></tr>)}</tbody></table>:<EmptyState title="No matching audit events" detail="The query completed successfully; adjust the filters to broaden the authoritative audit search."/>}</section>}
  </div>;
}
