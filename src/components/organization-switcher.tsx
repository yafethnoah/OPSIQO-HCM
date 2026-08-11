'use client';

import { useEffect, useState } from 'react';
import { activeOrgId, apiFetch, setActiveOrgId } from '@/lib/http/client';

type Org = { orgId:string; name:string; role:string; status:string };

export function OrganizationSwitcher() {
  const [organizations,setOrganizations]=useState<Org[]>([]);
  const [selected,setSelected]=useState('');
  const [error,setError]=useState('');

  useEffect(() => {
    setSelected(activeOrgId());
    apiFetch<{data:Org[]}>('/api/me/organizations').then((r) => {
      setOrganizations(r.data);
      if (r.data.length && !r.data.some(o => o.orgId === activeOrgId())) {
        setActiveOrgId(r.data[0]!.orgId);
        setSelected(r.data[0]!.orgId);
      }
    }).catch((e) => setError(e instanceof Error ? e.message : 'Unable to load organizations.'));
  }, []);

  if (error) return <div className="orgSwitcherError" title={error}>Organization unavailable</div>;
  if (!organizations.length) return <div className="orgSwitcherSkeleton">Loading organization…</div>;

  return <label className="orgSwitcher">
    <span>Organization</span>
    <select value={selected} onChange={(e) => {
      const orgId=e.target.value;
      setActiveOrgId(orgId); setSelected(orgId);
      window.location.assign('/dashboard');
    }}>
      {organizations.map(o => <option key={o.orgId} value={o.orgId}>{o.name} · {o.role.replaceAll('_',' ')}</option>)}
    </select>
  </label>;
}
