'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { activeOrgId, apiFetch } from '@/lib/http/client';
type Worker = { id: string; displayName: string; employeeNumber: string; workEmail: string; status: string; hireDate?: string };
type Unit = { id:string; name:string };
type Position = { id:string; title:string; orgUnitId:string; availableHeadcount:number; capacityState:string };

export function PeopleTable() {
  const [data, setData] = useState<Worker[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [query,setQuery]=useState('');
  const [nextCursor,setNextCursor]=useState<string|null>(null);
  const [loadingMore,setLoadingMore]=useState(false);

  const load = async (cursor?: string, append=false, q=query) => {
    const orgId=activeOrgId();
    try {
      const params=new URLSearchParams({pageSize:'50'}); if(q.trim()) params.set('q',q.trim()); if(cursor) params.set('cursor',cursor);
      const [workers, unitsResult, positionsResult] = await Promise.all([
        apiFetch<{data: Worker[];nextCursor:string|null}>(`/api/organizations/${orgId}/employees?${params}`),
        apiFetch<{data: Unit[]}>(`/api/organizations/${orgId}/org-units`),
        apiFetch<{data: Position[]}>(`/api/organizations/${orgId}/positions`),
      ]);
      setData(prev=>append?[...prev,...workers.data]:workers.data); setNextCursor(workers.nextCursor); setUnits(unitsResult.data); setPositions(positionsResult.data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load people.'); }
  };
  useEffect(() => { load(); }, []);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('');
    const f = new FormData(e.currentTarget);
    const positionId = String(f.get('positionId') || '');
    try {
      await apiFetch(`/api/organizations/${activeOrgId()}/employees`, { method: 'POST', body: JSON.stringify({
        legalFirstName: f.get('firstName'), legalLastName: f.get('lastName'), workEmail: f.get('email'),
        employeeNumber: f.get('employeeNumber'), employmentType: f.get('employmentType'), hireDate: f.get('hireDate'),
        orgUnitId: selectedUnit || undefined, positionId: positionId || undefined,
        managerWorkerId: f.get('managerWorkerId') || undefined,
      })});
      e.currentTarget.reset(); setSelectedUnit(''); setShow(false); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create employee.'); }
  }

  const availablePositions = positions.filter((p) => (!selectedUnit || p.orgUnitId === selectedUnit) && p.availableHeadcount > 0);

  return <div className="stack">
    <div className="paginationBar"><div className="searchRow"><input className="input" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();load(undefined,false,query);}}} placeholder="Search name, email, or #employee number"/><button className="button secondary" onClick={()=>load(undefined,false,query)}>Search</button><button className="button secondary" onClick={()=>{setQuery('');load(undefined,false,'');}}>Reset</button></div><button className="button" onClick={() => setShow(v => !v)}>+ Add employee</button></div>
    <div className="muted">Showing {data.length} worker records in the current result set. Results are server-paginated.</div>

    {show && <form className="card stack" onSubmit={create}>
      <div className="formGrid">
        <Field label="First name" name="firstName" /> <Field label="Last name" name="lastName" />
        <Field label="Work email" name="email" type="email" /> <Field label="Employee number" name="employeeNumber" />
        <Field label="Hire date" name="hireDate" type="date" />
        <label className="field"><span>Employment type</span><select className="input" name="employmentType" defaultValue="permanent"><option>permanent</option><option>temporary</option><option>contractor</option><option>intern</option><option>volunteer</option></select></label>
        <label className="field"><span>Organization unit</span><select className="input" value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)}><option value="">Unassigned</option>{units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
        <label className="field"><span>Position</span><select className="input" name="positionId" defaultValue=""><option value="">Unassigned</option>{availablePositions.map(p => <option key={p.id} value={p.id}>{p.title} · {p.availableHeadcount} seat(s)</option>)}</select></label>
        <label className="field"><span>Manager</span><select className="input" name="managerWorkerId" defaultValue=""><option value="">No manager</option>{data.map(w => <option key={w.id} value={w.id}>{w.displayName}</option>)}</select></label>
      </div>
      <div className="notice">Creating an employee validates unique employee number, unique work email and position capacity before committing the Person → Worker → Employment → Assignment transaction.</div>
      <div><button className="button" type="submit">Create authoritative worker record</button></div>
    </form>}
    {error && <div className="error">{error}</div>}
    <div className="card tableWrap"><table><thead><tr><th>Employee</th><th>ID</th><th>Email</th><th>Hire date</th><th>Status</th><th></th></tr></thead><tbody>
      {data.map(w => <tr key={w.id}><td><strong>{w.displayName}</strong></td><td>{w.employeeNumber}</td><td>{w.workEmail}</td><td>{w.hireDate || '—'}</td><td><span className="badge">{w.status}</span></td><td><Link className="textLink" href={`/people/${w.id}`}>Open profile →</Link></td></tr>)}
      {!data.length && <tr><td colSpan={6} className="muted">No live workers yet. Run the seed or add the first employee.</td></tr>}
    </tbody></table></div>
    {nextCursor&&<div className="paginationBar"><span className="muted">More results are available.</span><button className="button secondary" disabled={loadingMore} onClick={async()=>{setLoadingMore(true);await load(nextCursor,true,query);setLoadingMore(false);}}>{loadingMore?'Loading…':'Load next 50'}</button></div>}
  </div>;
}
function Field({label, name, type='text'}: {label:string; name:string; type?:string}) { return <label className="field"><span>{label}</span><input required className="input" name={name} type={type} /></label>; }
