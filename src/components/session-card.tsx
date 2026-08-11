'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/http/client';

type Actor = { uid: string; orgId: string; role: string; workerId?: string; permissions: string[]; demo?: boolean };
export function SessionCard({ mode }: { mode: 'self' | 'manager' }) {
  const [actor, setActor] = useState<Actor | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { apiFetch<{actor: Actor}>('/api/me').then(r => setActor(r.actor)).catch(e => setError(e.message)); }, []);
  return <div className="grid2">
    <section className="card">
      <h2 className="sectionTitle">{mode === 'self' ? 'My HR identity' : 'Manager access context'}</h2>
      {error && <div className="error">{error}</div>}
      {actor && <div className="stack">
        <div><div className="metricLabel">Role</div><strong>{actor.role}</strong></div>
        <div><div className="metricLabel">Organization</div><strong>{actor.orgId}</strong></div>
        <div><div className="metricLabel">Worker mapping</div><strong>{actor.workerId || 'Not mapped yet'}</strong></div>
        {actor.demo && <div className="badge">Demo mode</div>}
      </div>}
    </section>
    <section className="card">
      <h2 className="sectionTitle">Authorized capabilities</h2>
      <div className="stack">{actor?.permissions.map(p => <div key={p} className="timelineItem ready"><i /><span>{p}</span></div>)}</div>
    </section>
  </div>;
}
