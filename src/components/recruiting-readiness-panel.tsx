'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { activeOrgId, apiFetch } from '@/lib/http/client';

type Readiness = {
  ai: {
    status: string;
    ready: boolean;
    message: string;
    provider: string;
    deterministicResumeFallback: string;
    deterministicInterviewFallback: string;
    adminHref: string;
  };
  openRequisitions: number;
  interviewEligibleApplications: number;
  duplicateActiveTitleGroups: { title: string; count: number }[];
};

type DashboardResponse = { data: { readiness?: Readiness } };
type Health = {
  productRelease?: string;
  featureRelease?: string;
  patchRelease?: string;
  sourceCommit?: string | null;
  deploymentRevision?: string | null;
  deploymentEnvironment?: string;
};

export function RecruitingReadinessPanel() {
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      setError('');
      const [dashboard, release] = await Promise.all([
        apiFetch<DashboardResponse>(`/api/organizations/${activeOrgId()}/recruiting/dashboard`),
        fetch('/api/health', { cache: 'no-store' }).then((response) => response.json() as Promise<Health>),
      ]);
      setReadiness(dashboard.data.readiness || null);
      setHealth(release);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Recruiting readiness could not be verified.');
    }
  }

  useEffect(() => {
    void load();
    const onOrg = () => void load();
    window.addEventListener('opsiqo:organization-changed', onOrg);
    return () => window.removeEventListener('opsiqo:organization-changed', onOrg);
  }, []);

  if (!readiness && !error) return null;

  return (
    <section className="card stack" data-opsiqo-recruiting-readiness="true">
      <div className="toolbar">
        <div>
          <span className="eyebrow">Recruiting readiness</span>
          <h2 className="sectionTitle">UAT and workflow readiness</h2>
          <p className="muted">OPSIQO separates configuration readiness from candidate evidence and employment decisions.</p>
        </div>
        <span className="badge" data-opsiqo-no-translate="true">
          {health?.patchRelease || health?.featureRelease || health?.productRelease || 'Release identity unavailable'}
        </span>
      </div>
      {error && <div className="error" role="alert">{error}</div>}
      {readiness && (
        <>
          <div className="grid4">
            <Metric label="Open requisitions" value={String(readiness.openRequisitions)} />
            <Metric label="Interview eligible" value={String(readiness.interviewEligibleApplications)} />
            <Metric label="Recruiting AI" value={readiness.ai.ready ? 'Ready' : 'Setup required'} />
            <Metric label="Duplicate title groups" value={String(readiness.duplicateActiveTitleGroups.length)} />
          </div>

          {!readiness.openRequisitions && (
            <div className="notice" role="status">
              No requisition is currently Open. Candidate auto-enrollment intentionally waits for an approved Open requisition.
            </div>
          )}

          {!readiness.ai.ready && (
            <div className="notice" role="status">
              <strong>Recruiting AI setup:</strong> {readiness.ai.message}{' '}
              <Link className="textLink" href={readiness.ai.adminHref}>Open AI governance</Link>.
              <div className="muted">Text-based resumes can still use deterministic parsing. Interview kits continue with the deterministic governed fallback.</div>
            </div>
          )}

          {readiness.ai.ready && (
            <div className="success" role="status">
              Recruiting AI is approved and available. Deterministic fallbacks remain available where applicable.
            </div>
          )}

          {readiness.duplicateActiveTitleGroups.length > 0 && (
            <div className="notice" role="status">
              <strong>Duplicate active requisition titles need review.</strong>
              <ul>
                {readiness.duplicateActiveTitleGroups.slice(0, 5).map((group) => (
                  <li key={group.title}><span data-opsiqo-no-translate="true">{group.title}</span> · {group.count} records</li>
                ))}
              </ul>
              Cancel, close, or place obsolete requisitions on hold rather than creating another duplicate.
            </div>
          )}

          <div className="muted" data-opsiqo-no-translate="true">
            Runtime: {health?.productRelease || 'unknown'}{health?.patchRelease ? ` · patch ${health.patchRelease}` : ''} · environment {health?.deploymentEnvironment || 'unknown'}
            {health?.sourceCommit ? ` · source ${health.sourceCommit.slice(0, 10)}` : ''}
            {health?.deploymentRevision ? ` · revision ${health.deploymentRevision}` : ''}
          </div>
        </>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><div className="metricLabel">{label}</div><div className="metricValue">{value}</div></div>;
}
