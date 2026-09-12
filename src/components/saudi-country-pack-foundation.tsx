'use client';

import { FormEvent, useEffect, useState } from 'react';
import { activeOrgId, apiFetch } from '@/lib/http/client';
import { LoadingState } from '@/components/data-states';
import type {
  SaudiContributionPreview,
  SaudiSocialInsuranceRegime,
  SaudiSanedApplicability,
} from '@/lib/strategic/saudi-country-pack';

type FoundationPayload = {
  certification: 'NOT_CERTIFIED';
  foundationVersion: string;
  simulationOnly: true;
  livePayrollEffect: false;
  officialSources: Array<{
    id: string;
    authority: 'HRSD' | 'GOSI';
    title: string;
    url: string;
    topic: string;
    effectiveDate?: string;
    observedAt: string;
    note: string;
  }>;
  newSystemPensionSchedule: Array<{
    from: string;
    to?: string;
    employeeRate: number;
    employerRate: number;
    sourceId: string;
  }>;
  releaseBlockers: string[];
};

const money = (value?: number) =>
  typeof value === 'number'
    ? new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 2 }).format(value)
    : '—';

const pct = (value?: number) => typeof value === 'number' ? `${(value * 100).toFixed(2)}%` : '—';

export function SaudiCountryPackFoundation() {
  const [payload, setPayload] = useState<FoundationPayload | null>(null);
  const [preview, setPreview] = useState<SaudiContributionPreview | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    saudiNationalConfirmed: false,
    regime: 'requires_review' as SaudiSocialInsuranceRegime,
    contributionDate: '2026-09-11',
    contributoryWageSar: 10000,
    sanedApplicable: 'requires_review' as SaudiSanedApplicability,
  });

  useEffect(() => {
    void apiFetch<{ data: FoundationPayload }>(`/api/organizations/${activeOrgId()}/strategic/saudi-foundation`)
      .then((response) => { setPayload(response.data); setError(''); })
      .catch((e) => setError(e instanceof Error ? e.message : 'Unable to load Saudi foundation evidence.'));
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setBusy(true);
      setError('');
      const response = await apiFetch<{ data: SaudiContributionPreview }>(
        `/api/organizations/${activeOrgId()}/strategic/saudi-foundation`,
        { method: 'POST', body: JSON.stringify(form) },
      );
      setPreview(response.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to calculate Saudi contribution preview.');
    } finally {
      setBusy(false);
    }
  };

  if (!payload) {
    return <div className="stack">{error && <div className="error">{error}</div>}<LoadingState label="Loading Saudi country-pack foundation…" /></div>;
  }

  return <div className="stack">
    {error && <div className="error">{error}</div>}

    <section className="card">
      <div className="row between wrap">
        <div>
          <h2 className="sectionTitle">Saudi Arabia country-pack foundation</h2>
          <p className="muted">Verified-source registry and deterministic contribution simulation foundation. No production payroll effect.</p>
        </div>
        <span className="badge">NOT CERTIFIED · FOUNDATION {payload.foundationVersion}</span>
      </div>
      <div className="error" style={{ marginTop: 12 }}>
        This is not legal advice and not Saudi regulatory certification. OPSIQO will not infer a worker's GOSI regime from hire date alone. Independent Saudi legal and payroll validation remain mandatory before activation.
      </div>
    </section>

    <section className="card tableWrap">
      <div className="row between wrap">
        <h2 className="sectionTitle">Registered official source catalog</h2>
        <span className="badge">{payload.officialSources.length} official sources</span>
      </div>
      <table>
        <thead><tr><th>Authority</th><th>Topic</th><th>Source</th><th>Effective / observed</th><th>Evidence boundary</th></tr></thead>
        <tbody>{payload.officialSources.map((source) => <tr key={source.id}>
          <td>{source.authority}</td>
          <td>{source.topic.replaceAll('_', ' ')}</td>
          <td><a href={source.url} target="_blank" rel="noreferrer"><strong>{source.title}</strong></a><div className="muted">{source.id}</div></td>
          <td>{source.effectiveDate || '—'}<div className="muted">Observed {source.observedAt}</div></td>
          <td>{source.note}</td>
        </tr>)}</tbody>
      </table>
    </section>

    <section className="card tableWrap">
      <h2 className="sectionTitle">New-system pension contribution schedule</h2>
      <p className="muted">Derived deterministically from the registered official GOSI phased-rate source. Applicability is human-confirmed; this table is not connected to live payroll.</p>
      <table>
        <thead><tr><th>From</th><th>Through</th><th>Employee pension</th><th>Employer pension</th><th>Source</th></tr></thead>
        <tbody>{payload.newSystemPensionSchedule.map((row) => <tr key={row.from}>
          <td>{row.from}</td><td>{row.to || 'onward'}</td><td>{pct(row.employeeRate)}</td><td>{pct(row.employerRate)}</td><td>{row.sourceId}</td>
        </tr>)}</tbody>
      </table>
    </section>

    <section className="card">
      <h2 className="sectionTitle">Human-reviewed contribution preview</h2>
      <p className="muted">For a Saudi-national applicability case only. This simulation creates no deduction, payroll record, filing, payment or compliance certification.</p>
      <form className="formGrid" onSubmit={submit}>
        <label><span>Saudi national confirmed by authorized human</span><select value={form.saudiNationalConfirmed ? 'yes' : 'no'} onChange={(e) => setForm({ ...form, saudiNationalConfirmed: e.target.value === 'yes' })}>
          <option value="no">No / not confirmed</option><option value="yes">Yes, confirmed</option>
        </select></label>
        <label><span>GOSI regime (human selected)</span><select value={form.regime} onChange={(e) => setForm({ ...form, regime: e.target.value as SaudiSocialInsuranceRegime })}>
          <option value="requires_review">Requires qualified review</option>
          <option value="new_1445_no_prior_subscription">New 1445 system · no prior subscription before 2024-07-03</option>
          <option value="existing_unaffected">Existing category · official unchanged-rate source applies</option>
        </select></label>
        <label><span>Contribution date</span><input type="date" value={form.contributionDate} onChange={(e) => setForm({ ...form, contributionDate: e.target.value })} /></label>
        <label><span>Contributory wage (SAR)</span><input type="number" min={0.01} step={0.01} value={form.contributoryWageSar} onChange={(e) => setForm({ ...form, contributoryWageSar: Number(e.target.value) })} /></label>
        <label><span>SANED applicability (human reviewed)</span><select value={form.sanedApplicable} onChange={(e) => setForm({ ...form, sanedApplicable: e.target.value as SaudiSanedApplicability })}>
          <option value="requires_review">Requires qualified review</option>
          <option value="yes">Applicable</option>
          <option value="no">Not applicable</option>
        </select></label>
        <button className="button" disabled={busy}>{busy ? 'Calculating…' : 'Preview contributions'}</button>
      </form>
    </section>

    {preview && <section className="card">
      <div className="row between wrap"><h2 className="sectionTitle">Preview result</h2><span className="badge">{preview.status.replaceAll('_', ' ')}</span></div>
      <p><strong>Country-pack certification:</strong> {preview.countryPackCertification} · <strong>Live payroll effect:</strong> NONE</p>
      {preview.blockers.length > 0 && <div className="error"><strong>Blocked:</strong><ul>{preview.blockers.map((item) => <li key={item}>{item}</li>)}</ul></div>}
      {preview.rates && preview.amounts && <div className="stack">
        <section className="metricGrid">
          <div className="card"><div className="muted">Wage used</div><strong>{money(preview.contributoryWageUsedSar)}</strong></div>
          <div className="card"><div className="muted">Employee total</div><strong>{money(preview.amounts.employeeTotalSar)}</strong></div>
          <div className="card"><div className="muted">Employer total</div><strong>{money(preview.amounts.employerTotalSar)}</strong></div>
          <div className="card"><div className="muted">Combined</div><strong>{money(preview.amounts.combinedTotalSar)}</strong></div>
        </section>
        <div className="tableWrap"><table><thead><tr><th>Component</th><th>Employee rate</th><th>Employer rate</th><th>Employee amount</th><th>Employer amount</th></tr></thead><tbody>
          <tr><td>Pension</td><td>{pct(preview.rates.employeePension)}</td><td>{pct(preview.rates.employerPension)}</td><td>{money(preview.amounts.employeePensionSar)}</td><td>{money(preview.amounts.employerPensionSar)}</td></tr>
          <tr><td>Occupational hazards</td><td>—</td><td>{pct(preview.rates.employerOccupationalHazards)}</td><td>—</td><td>{money(preview.amounts.employerOccupationalHazardsSar)}</td></tr>
          <tr><td>SANED</td><td>{pct(preview.rates.employeeSaned)}</td><td>{pct(preview.rates.employerSaned)}</td><td>{money(preview.amounts.employeeSanedSar)}</td><td>{money(preview.amounts.employerSanedSar)}</td></tr>
        </tbody></table></div>
      </div>}
      {preview.warnings.length > 0 && <div><strong>Warnings</strong><ul>{preview.warnings.map((item) => <li key={item}>{item}</li>)}</ul></div>}
      <p className="muted">Sources: {preview.sourceIds.join(', ')}</p>
    </section>}

    <section className="card">
      <h2 className="sectionTitle">Country-pack release blockers still open</h2>
      <ul>{payload.releaseBlockers.map((item) => <li key={item}>{item}</li>)}</ul>
    </section>
  </div>;
}