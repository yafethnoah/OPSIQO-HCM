'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase/client';
import { apiFetch, clearActiveOrgId, setActiveOrgId, tryActiveOrgId } from '@/lib/http/client';

type Org = { orgId:string; name:string; role:string; status:string };

export function OrganizationSwitcher() {
  const [organizations,setOrganizations] = useState<Org[]>([]);
  const [selected,setSelected] = useState('');
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(true);
  const [switching,setSwitching] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadOrganizations = async () => {
      if (cancelled) return;
      setLoading(true);
      setError('');

      try {
        const response = await apiFetch<{data:Org[]}>('/api/me/organizations', { orgContext:'omit' });
        if (cancelled) return;

        const eligible = response.data.filter((org) => org.status === 'active');
        setOrganizations(eligible);

        const current = tryActiveOrgId();
        const resolved = current && eligible.some((org) => org.orgId === current)
          ? current
          : eligible[0]?.orgId || '';

        if (!resolved) {
          if (current) clearActiveOrgId();
          setSelected('');
          return;
        }

        setSelected(resolved);

        if (resolved !== current) {
          // Membership discovery already validated this organization server-side.
          // Establish the local tenant context only after that identity-scoped read.
          setActiveOrgId(resolved);
          window.location.reload();
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unable to load organizations.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (process.env.NEXT_PUBLIC_OPSIQO_DEMO_MODE === 'true') {
      void loadOrganizations();
      return () => { cancelled = true; };
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth(), (user) => {
      if (cancelled) return;
      if (!user) {
        clearActiveOrgId();
        setOrganizations([]);
        setSelected('');
        setError('Sign in required.');
        setLoading(false);
        return;
      }
      void loadOrganizations();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  async function activateOrganization(orgId: string) {
    if (!orgId || orgId === selected || switching) return;
    setSwitching(true);
    setError('');
    try {
      const response = await apiFetch<{data:Org}>('/api/me/organizations/activate', {
        method: 'POST',
        orgContext: 'omit',
        body: JSON.stringify({ orgId, reason: 'user_switch' }),
      });
      setActiveOrgId(response.data.orgId);
      setSelected(response.data.orgId);
      window.location.assign('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to switch organizations.');
    } finally {
      setSwitching(false);
    }
  }

  if (loading) return <div className="orgSwitcherSkeleton">Loading organizations…</div>;
  if (error && !organizations.length) return <div className="orgSwitcherError" title={error}><span>Organization unavailable</span><br/><Link href="/signin">Sign in / switch account</Link></div>;
  if (!organizations.length) return <div className="orgSwitcherSkeleton"><span>No active organization membership</span></div>;

  return <label className="orgSwitcher">
    <span>{organizations.length > 1 ? `Organization · ${organizations.length}` : 'Organization'}</span>
    <select
      value={selected}
      disabled={switching}
      aria-busy={switching}
      onChange={(event) => void activateOrganization(event.target.value)}
    >
      {organizations.map((org) => (
        <option key={org.orgId} value={org.orgId}>
          {org.name} · {org.role.replaceAll('_',' ')}
        </option>
      ))}
    </select>
    {error && <small className="error">{error}</small>}
  </label>;
}
