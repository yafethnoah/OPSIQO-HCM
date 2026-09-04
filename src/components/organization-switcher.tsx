'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase/client';
import { apiFetch, setActiveOrgId, tryActiveOrgId } from '@/lib/http/client';
import { shellText, useShellLocale } from '@/lib/opsiqo-one/shell-i18n';

type Org = { orgId:string; name:string; role:string; status:string };

export function OrganizationSwitcher() {
  const shellLocale=useShellLocale();
  const [organizations,setOrganizations]=useState<Org[]>([]);
  const [selected,setSelected]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadOrganizations = async () => {
      if (cancelled) return;
      setLoading(true);
      setError('');

      try {
        // Membership discovery is identity-scoped, not organization-scoped.
        // Do not send a guessed/stale x-org-id during cold-start bootstrap.
        const response = await apiFetch<{data:Org[]}>('/api/me/organizations', { orgContext:'omit' });
        if (cancelled) return;

        const eligible = response.data.filter((org) => org.status === 'active');
        setOrganizations(eligible);

        const current = tryActiveOrgId();
        const resolved = current && eligible.some((org) => org.orgId === current)
          ? current
          : eligible[0]?.orgId || '';

        if (!resolved) {
          setSelected('');
          return;
        }

        setSelected(resolved);

        if (resolved !== current) {
          setActiveOrgId(resolved);
          // Other page modules may have mounted before organization discovery and
          // failed closed. Reload once after establishing a valid membership-backed
          // organization context so all tenant-scoped modules start consistently.
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

  if (loading) return <div className="orgSwitcherSkeleton">{shellText('Loading organization…',shellLocale)}</div>;
  if (error) return <div className="orgSwitcherError" title={error}><span>{shellText('Organization unavailable',shellLocale)}</span><br/><Link href="/setup">{shellText('Set up / reconnect',shellLocale)}</Link></div>;
  if (!organizations.length) return <div className="orgSwitcherSkeleton"><Link href="/setup">{shellText('Set up organization',shellLocale)}</Link></div>;

  return <label className="orgSwitcher">
    <span>{shellText('Organization',shellLocale)}</span>
    <select value={selected} onChange={(e) => {
      const orgId = e.target.value;
      setActiveOrgId(orgId);
      setSelected(orgId);
      window.location.assign('/dashboard');
    }}>
      {organizations.map((org) => {const role=org.role.replaceAll('_',' ');return <option key={org.orgId} value={org.orgId}>{org.name} · {shellText(role,shellLocale)}</option>})}
    </select>
  </label>;
}
