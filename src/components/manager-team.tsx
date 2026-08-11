'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { activeOrgId, apiFetch } from '@/lib/http/client';

type TeamRow={worker:{id:string;displayName:string;employeeNumber:string;workEmail:string;status:string};assignment:{startDate:string};position?:{title:string};orgUnit?:{name:string}};

export function ManagerTeam(){
  const[data,setData]=useState<TeamRow[]>([]);const[error,setError]=useState('');
  useEffect(()=>{apiFetch<{data:TeamRow[]}>(`/api/organizations/${activeOrgId()}/manager/team`).then(r=>setData(r.data)).catch(e=>setError(e.message));},[]);
  return <div className="stack">
    {error&&<div className="error">{error}</div>}
    <div className="grid4">
      <div className="card"><div className="metricLabel">Direct reports</div><div className="metricValue">{data.length}</div><div className="metricFoot">Derived from current primary assignments</div></div>
      <div className="card"><div className="metricLabel">Active</div><div className="metricValue">{data.filter(x=>x.worker.status==='active').length}</div><div className="metricFoot">Current worker status</div></div>
      <div className="card"><div className="metricLabel">On leave</div><div className="metricValue">{data.filter(x=>x.worker.status==='leave').length}</div><div className="metricFoot">Team availability signal</div></div>
      <div className="card"><div className="metricLabel">Structure source</div><div className="profileValue">Assignment</div><div className="metricFoot">Not a manually maintained manager list</div></div>
    </div>
    <section className="card tableWrap"><h2 className="sectionTitle">My team</h2><table><thead><tr><th>Employee</th><th>Position</th><th>Org unit</th><th>Status</th><th></th></tr></thead><tbody>
      {data.map(row=><tr key={row.worker.id}><td><strong>{row.worker.displayName}</strong><div className="muted">{row.worker.employeeNumber}</div></td><td>{row.position?.title||'—'}</td><td>{row.orgUnit?.name||'—'}</td><td><span className="badge">{row.worker.status}</span></td><td><Link className="textLink" href={`/people/${row.worker.id}`}>View →</Link></td></tr>)}
      {!data.length&&<tr><td colSpan={5} className="muted">No current direct reports were found for this manager membership.</td></tr>}
    </tbody></table></section>
  </div>;
}
