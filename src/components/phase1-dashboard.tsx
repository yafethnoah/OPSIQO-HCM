'use client';

import { useEffect, useMemo, useState } from 'react';
import { activeOrgId, apiFetch } from '@/lib/http/client';


type Worker = { id: string; displayName: string; employeeNumber: string; workEmail: string; status: string };
type Position = { id: string; title: string; positionCode: string; status: string };
type OrgUnit = { id: string; name: string; type: string; status: string };
type Workflow = { id: string; name: string; enabled: boolean; trigger: string };

export function Phase1Dashboard() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [units, setUnits] = useState<OrgUnit[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch<{data: Worker[]}>(`/api/organizations/${activeOrgId()}/employees`),
      apiFetch<{data: Position[]}>(`/api/organizations/${activeOrgId()}/positions`),
      apiFetch<{data: OrgUnit[]}>(`/api/organizations/${activeOrgId()}/org-units`),
      apiFetch<{data: Workflow[]}>(`/api/organizations/${activeOrgId()}/workflows`),
    ]).then(([w, p, u, f]) => {
      setWorkers(w.data); setPositions(p.data); setUnits(u.data); setWorkflows(f.data);
    }).catch((e) => setError(e.message));
  }, []);

  const openPositions = useMemo(() => positions.filter((p) => p.status === 'open').length, [positions]);

  return <div className="stack">
    {error && <div className="notice">Connect Firebase and run the seed command to activate live Phase 1 data. Detail: {error}</div>}
    <div className="grid4">
      <Metric label="Active workers" value={workers.filter(w => w.status === 'active').length} foot="Authoritative worker records" />
      <Metric label="Positions" value={positions.length} foot={`${openPositions} currently open`} />
      <Metric label="Org units" value={units.length} foot="Company structure" />
      <Metric label="Workflows" value={workflows.filter(w => w.enabled).length} foot="Enabled automations" />
    </div>
    <div className="grid2">
      <section className="card">
        <h2 className="sectionTitle">Platform operating model</h2>
        <div className="timeline">
          <Timeline text="Core workforce data model" ready />
          <Timeline text="Tenant-aware RBAC" ready />
          <Timeline text="Atomic audit logging" ready />
          <Timeline text="Workflow definitions + runs" ready />
          <Timeline text="Employee / manager portals" ready />
          <Timeline text="Recruiting lifecycle core" ready />
        </div>
      </section>
      <section className="card">
        <h2 className="sectionTitle">Control plane</h2>
        <p className="muted">All protected APIs resolve organization membership server-side before reading or writing Firestore.</p>
        <p><span className="badge">Fail closed</span> Production requests require a verified Firebase ID token and active organization membership.</p>
        <p><span className="badge">Demo isolated</span> Authentication bypass works only when explicit demo mode is enabled on the server.</p>
      </section>
    </div>
  </div>;
}

function Metric({ label, value, foot }: {label: string; value: number; foot: string}) {
  return <div className="card"><div className="metricLabel">{label}</div><div className="metricValue">{value}</div><div className="metricFoot">{foot}</div></div>;
}
function Timeline({ text, ready }: {text: string; ready?: boolean}) {
  return <div className={`timelineItem ${ready ? 'ready' : ''}`}><i /><span>{text}</span><span className="badge">Ready</span></div>;
}
