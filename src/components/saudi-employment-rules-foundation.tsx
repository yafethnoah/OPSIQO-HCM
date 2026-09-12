'use client';

import { FormEvent, useEffect, useState } from 'react';
import { LoadingState } from '@/components/data-states';
import { activeOrgId, apiFetch } from '@/lib/http/client';
import type {
  SaudiEosbPreview,
  SaudiSeparationBasis,
  SaudiWorkLeavePreview,
} from '@/lib/strategic/saudi-employment-rules';

type Payload = ReturnType<typeof import('@/lib/strategic/saudi-employment-rules').saudiEmploymentRulesPayload>;
const money = (value?: number) => typeof value === 'number'
  ? new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(value)
  : '—';

export function SaudiEmploymentRulesFoundation() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [error, setError] = useState('');
  const [eosb, setEosb] = useState<SaudiEosbPreview | null>(null);
  const [work, setWork] = useState<SaudiWorkLeavePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [eosbForm, setEosbForm] = useState({
    lastMonthlyWageSar: 10000,
    serviceYears: 6,
    separationBasis: 'requires_review' as SaudiSeparationBasis,
  });
  const [workForm, setWorkForm] = useState({
    yearsOfService: 4,
    muslimRamadan: false,
    hourlyWageSar: 50,
    basicHourlyWageSar: 40,
    overtimeHours: 2,
  });

  useEffect(() => {
    void apiFetch<{ data: Payload }>(`/api/organizations/${activeOrgId()}/strategic/saudi-employment-rules`)
      .then((r) => setPayload(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Unable to load Saudi employment rules.'));
  }, []);

  const post = async (kind: 'eosb' | 'work_leave', input: unknown) => {
    setBusy(true); setError('');
    try {
      const result = await apiFetch<{ data: SaudiEosbPreview | SaudiWorkLeavePreview }>(`/api/organizations/${activeOrgId()}/strategic/saudi-employment-rules`, {
        method: 'POST',
        body: JSON.stringify({ kind, input }),
      });
      if (kind === 'eosb') setEosb(result.data as SaudiEosbPreview);
      else setWork(result.data as SaudiWorkLeavePreview);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Saudi employment-rule preview failed.');
    } finally { setBusy(false); }
  };

  if (!payload) return <div className="stack">{error && <div className="error">{error}</div>}<LoadingState label="Loading Saudi employment-rule evidence…" /></div>;

  return <div className="stack">
    {error && <div className="error">{error}</div>}
    <section className="card">
      <div className="row between wrap">
        <div><h2 className="sectionTitle">Saudi employment rules foundation</h2><p className="muted">Verified-source EOSB, leave, working-time and overtime simulation. No production employment or payroll effect.</p></div>
        <span className="badge">NOT CERTIFIED · FOUNDATION {payload.version}</span>
      </div>
      <div className="error">Not legal advice. These previews are deterministic from registered official HRSD source rules but still require independent Saudi legal/payroll validation before production use.</div>
    </section>

    <section className="card tableWrap">
      <h2 className="sectionTitle">Registered employment-rule sources</h2>
      <table><thead><tr><th>Source</th><th>Articles</th><th>Evidence boundary</th></tr></thead>
      <tbody>{payload.sources.map((s) => <tr key={s.id}><td><a href={s.url} target="_blank" rel="noreferrer"><strong>{s.title}</strong></a><div className="muted">{s.id}</div></td><td>{s.articles.join(', ')}</td><td>{s.note}</td></tr>)}</tbody></table>
    </section>

    <section className="card tableWrap">
      <h2 className="sectionTitle">Rule registry</h2>
      <table><thead><tr><th>Rule</th><th>Current foundation interpretation</th><th>Source</th></tr></thead>
      <tbody>{payload.rules.map((r) => <tr key={r.id}><td>{r.label}<div className="muted">{r.id}</div></td><td>{r.detail}</td><td>{r.sourceId}</td></tr>)}</tbody></table>
    </section>

    <section className="card">
      <h2 className="sectionTitle">Human-reviewed EOSB preview</h2>
      <form className="formGrid" onSubmit={(e: FormEvent) => { e.preventDefault(); void post('eosb', eosbForm); }}>
        <label><span>Last monthly wage used for Article 84 (SAR)</span><input type="number" min={0.01} step={0.01} value={eosbForm.lastMonthlyWageSar} onChange={(e) => setEosbForm({ ...eosbForm, lastMonthlyWageSar: Number(e.target.value) })} /></label>
        <label><span>Continuous service years</span><input type="number" min={0} step={0.01} value={eosbForm.serviceYears} onChange={(e) => setEosbForm({ ...eosbForm, serviceYears: Number(e.target.value) })} /></label>
        <label><span>Separation basis (human selected)</span><select value={eosbForm.separationBasis} onChange={(e) => setEosbForm({ ...eosbForm, separationBasis: e.target.value as SaudiSeparationBasis })}>
          <option value="requires_review">Requires qualified review</option>
          <option value="employer_or_contract_end">Employer / contract-end case with no identified Article 80 exclusion</option>
          <option value="resignation">Resignation</option>
          <option value="force_majeure">Article 87 force majeure exception</option>
          <option value="female_article87_exception">Article 87 qualifying female-worker exception</option>
          <option value="article80_possible">Possible Article 80 exclusion</option>
        </select></label>
        <button className="button" disabled={busy}>Preview EOSB</button>
      </form>
      {eosb && <div className="stack" style={{ marginTop: 12 }}>
        <div className="row wrap"><span className="badge">{eosb.status.replaceAll('_', ' ')}</span><span><strong>Certification:</strong> {eosb.countryPackCertification} · <strong>Live effect:</strong> NONE</span></div>
        {eosb.blockers.length > 0 && <div className="error"><ul>{eosb.blockers.map((b) => <li key={b}>{b}</li>)}</ul></div>}
        {typeof eosb.estimatedAwardSar === 'number' && <section className="metricGrid">
          <div className="card"><div className="muted">Base Article 84 award</div><strong>{money(eosb.baseAwardSar)}</strong></div>
          <div className="card"><div className="muted">Entitlement multiplier</div><strong>{((eosb.multiplier || 0) * 100).toFixed(2)}%</strong></div>
          <div className="card"><div className="muted">Estimated award</div><strong>{money(eosb.estimatedAwardSar)}</strong></div>
        </section>}
        <ul>{eosb.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
      </div>}
    </section>

    <section className="card">
      <h2 className="sectionTitle">Working-time / annual-leave / overtime preview</h2>
      <form className="formGrid" onSubmit={(e: FormEvent) => { e.preventDefault(); void post('work_leave', workForm); }}>
        <label><span>Years of service</span><input type="number" min={0} step={0.01} value={workForm.yearsOfService} onChange={(e) => setWorkForm({ ...workForm, yearsOfService: Number(e.target.value) })} /></label>
        <label><span>Muslim worker during Ramadan</span><select value={workForm.muslimRamadan ? 'yes' : 'no'} onChange={(e) => setWorkForm({ ...workForm, muslimRamadan: e.target.value === 'yes' })}><option value="no">No</option><option value="yes">Yes</option></select></label>
        <label><span>Hourly wage (SAR)</span><input type="number" min={0} step={0.01} value={workForm.hourlyWageSar} onChange={(e) => setWorkForm({ ...workForm, hourlyWageSar: Number(e.target.value) })} /></label>
        <label><span>Basic hourly wage (SAR)</span><input type="number" min={0} step={0.01} value={workForm.basicHourlyWageSar} onChange={(e) => setWorkForm({ ...workForm, basicHourlyWageSar: Number(e.target.value) })} /></label>
        <label><span>Overtime hours</span><input type="number" min={0} step={0.25} value={workForm.overtimeHours} onChange={(e) => setWorkForm({ ...workForm, overtimeHours: Number(e.target.value) })} /></label>
        <button className="button" disabled={busy}>Preview work & leave rules</button>
      </form>
      {work && <div className="stack" style={{ marginTop: 12 }}>
        <div className="row wrap"><span className="badge">{work.status.replaceAll('_', ' ')}</span><span><strong>Certification:</strong> {work.countryPackCertification} · <strong>Live effect:</strong> NONE</span></div>
        {work.blockers.length > 0 && <div className="error"><ul>{work.blockers.map((b) => <li key={b}>{b}</li>)}</ul></div>}
        {typeof work.annualLeaveDays === 'number' && <section className="metricGrid">
          <div className="card"><div className="muted">Annual leave</div><strong>{work.annualLeaveDays} days</strong></div>
          <div className="card"><div className="muted">Max actual hours/day</div><strong>{work.maxActualHoursPerDay}</strong></div>
          <div className="card"><div className="muted">Max actual hours/week</div><strong>{work.maxActualHoursPerWeek}</strong></div>
          <div className="card"><div className="muted">Overtime pay</div><strong>{money(work.overtimePayTotalSar)}</strong><div className="muted">{money(work.overtimePayPerHourSar)} / overtime hour</div></div>
        </section>}
        <ul>{work.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
      </div>}
    </section>

    <section className="card tableWrap">
      <h2 className="sectionTitle">Fixed leave-rule registry</h2>
      <table><thead><tr><th>Leave</th><th>Foundation entitlement</th><th>Source</th></tr></thead>
      <tbody>{payload.fixedLeaveRules.map((r) => <tr key={r.label}><td>{r.label}</td><td>{r.entitlement}</td><td>{r.sourceId}</td></tr>)}</tbody></table>
    </section>

    <section className="card">
      <h2 className="sectionTitle">Release blockers still open</h2>
      <ul>{payload.releaseBlockers.map((b) => <li key={b}>{b}</li>)}</ul>
    </section>
  </div>;
}