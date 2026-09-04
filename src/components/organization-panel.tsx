'use client';

import { FormEvent, useEffect, useState, useRef } from 'react';
import { activeOrgId, apiFetch } from '@/lib/http/client';
import { useLegacySurfaceTranslation } from '@/lib/opsiqo-one/legacy-surface-i18n';

type Unit = { id: string; name: string; code: string; type: string; status: string; parentId?: string };
type Position = { id: string; title: string; positionCode: string; orgUnitId: string; status: string; fte: number; headcountLimit:number; occupiedHeadcount:number; availableHeadcount:number; occupancyPercent:number; capacityState:string };

export function OrganizationPanel() {
  const translationRoot = useRef<HTMLDivElement>(null);
  useLegacySurfaceTranslation('organization_admin', translationRoot);
  const [units, setUnits] = useState<Unit[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [u, p] = await Promise.all([
        apiFetch<{data: Unit[]}>(`/api/organizations/${activeOrgId()}/org-units`),
        apiFetch<{data: Position[]}>(`/api/organizations/${activeOrgId()}/positions`),
      ]);
      setUnits(u.data); setPositions(p.data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load organization.'); }
  };
  useEffect(() => { load(); }, []);

  async function addUnit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('');
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      await apiFetch(`/api/organizations/${activeOrgId()}/org-units`, { method: 'POST', body: JSON.stringify({ name: f.get('name'), code: f.get('code'), type: f.get('type'), parentId: f.get('parentId') || undefined }) });
      form.reset(); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create unit.'); }
  }

  async function addPosition(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('');
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      await apiFetch(`/api/organizations/${activeOrgId()}/positions`, { method: 'POST', body: JSON.stringify({
        positionCode: f.get('positionCode'), title: f.get('title'), orgUnitId: f.get('orgUnitId'),
        reportsToPositionId: f.get('reportsToPositionId') || undefined,
        status: 'open', fte: Number(f.get('fte') || 1), headcountLimit: Number(f.get('headcountLimit') || 1),
      }) });
      form.reset(); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create position.'); }
  }

  return <div ref={translationRoot} className="stack">
    {error && <div className="error">{error}</div>}
    <div className="grid2">
      <form className="card stack" onSubmit={addUnit}>
        <h2 className="sectionTitle">Create organization unit</h2>
        <div className="formGrid">
          <label className="field"><span>Name</span><input required className="input" name="name" /></label>
          <label className="field"><span>Code</span><input required className="input" name="code" /></label>
          <label className="field"><span>Type</span><select className="input" name="type" defaultValue="department"><option>company</option><option>division</option><option>department</option><option>team</option><option>location</option></select></label>
          <label className="field"><span>Parent unit</span><select className="input" name="parentId" defaultValue=""><option value="">Root</option>{units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
        </div>
        <div><button className="button">Add unit</button></div>
      </form>
      <form className="card stack" onSubmit={addPosition}>
        <h2 className="sectionTitle">Create position</h2>
        <div className="formGrid">
          <label className="field"><span>Position title</span><input required className="input" name="title" /></label>
          <label className="field"><span>Position code</span><input required className="input" name="positionCode" /></label>
          <label className="field"><span>Org unit</span><select required className="input" name="orgUnitId"><option value="">Select unit</option>{units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
          <label className="field"><span>Reports to position</span><select className="input" name="reportsToPositionId" defaultValue=""><option value="">No parent position</option>{positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
          <label className="field"><span>FTE</span><input className="input" name="fte" type="number" step="0.1" min="0" max="2" defaultValue="1" /></label>
          <label className="field"><span>Headcount capacity</span><input className="input" name="headcountLimit" type="number" min="1" max="100" defaultValue="1" /></label>
        </div>
        <div><button className="button">Add position</button></div>
      </form>
    </div>
    <div className="grid2">
      <section className="card tableWrap"><h2 className="sectionTitle">Organization units</h2><table><thead><tr><th>Unit</th><th>Code</th><th>Type</th><th>Parent</th></tr></thead><tbody>{units.map(u => <tr key={u.id}><td>{u.name}</td><td>{u.code}</td><td><span className="badge">{u.type}</span></td><td>{units.find(x => x.id === u.parentId)?.name || '—'}</td></tr>)}</tbody></table></section>
      <section className="card tableWrap"><h2 className="sectionTitle">Position occupancy</h2><table><thead><tr><th>Position</th><th>Capacity</th><th>Occupancy</th><th>State</th></tr></thead><tbody>{positions.map(p => <tr key={p.id}><td><strong>{p.title}</strong><div className="muted">{p.positionCode}</div></td><td>{p.occupiedHeadcount}/{p.headcountLimit}</td><td><div className="miniProgress"><span style={{width:`${Math.min(100,p.occupancyPercent)}%`}} /></div><div className="muted">{p.occupancyPercent}%</div></td><td><span className="badge">{p.capacityState.replaceAll('_',' ')}</span></td></tr>)}</tbody></table></section>
    </div>
  </div>;
}
