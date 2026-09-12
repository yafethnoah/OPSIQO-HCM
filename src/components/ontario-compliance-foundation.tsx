'use client';

import { FormEvent, useEffect, useState } from 'react';
import { LoadingState } from '@/components/data-states';
import { activeOrgId, apiFetch } from '@/lib/http/client';
import type {
  OntarioEmploymentPreviewInput,
  OntarioSeparationPreviewInput,
} from '@/lib/country-compliance/ontario-rules';

type Payload = ReturnType<typeof import('@/lib/country-compliance/ontario-rules').ontarioCompliancePayload>;
type EmploymentResult = ReturnType<typeof import('@/lib/country-compliance/ontario-rules').previewOntarioEmploymentStandards>;
type SeparationResult = ReturnType<typeof import('@/lib/country-compliance/ontario-rules').previewOntarioSeparation>;

const money = (value?: number) =>
  typeof value === 'number'
    ? new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2 }).format(value)
    : '—';

const askAi = (prompt: string) =>
  window.dispatchEvent(new CustomEvent('opsiqo:ai-assist', { detail: { prompt } }));

export function OntarioComplianceFoundation() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [employment, setEmployment] = useState<EmploymentResult | null>(null);
  const [separation, setSeparation] = useState<SeparationResult | null>(null);
  const [employmentForm, setEmploymentForm] = useState<OntarioEmploymentPreviewInput>({
    effectiveDate: '2026-09-12',
    regularHourlyRate: 20,
    workWeekHours: 48,
    serviceYears: 4,
    vacationGrossWages: 50000,
    publicHolidayRegularWages4Weeks: 3200,
    publicHolidayVacationPay4Weeks: 128,
  });
  const [separationForm, setSeparationForm] = useState<OntarioSeparationPreviewInput>({
    serviceYears: 6,
    regularWeeklyWage: 1200,
    severanceEligibilityReviewed: false,
    severanceQualifies: false,
  });

  useEffect(() => {
    void apiFetch<{ data: Payload }>(
      `/api/organizations/${activeOrgId()}/country-compliance/ontario/rules`,
    )
      .then((response) => setPayload(response.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Unable to load Ontario compliance foundation.'));
  }, []);

  const post = async (kind: 'employment_standards' | 'separation', input: unknown) => {
    setBusy(kind); setError('');
    try {
      const response = await apiFetch<{ data: EmploymentResult | SeparationResult }>(
        `/api/organizations/${activeOrgId()}/country-compliance/ontario/rules`,
        { method: 'POST', body: JSON.stringify({ kind, input }) },
      );
      if (kind === 'employment_standards') setEmployment(response.data as EmploymentResult);
      else setSeparation(response.data as SeparationResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ontario compliance preview failed.');
    } finally {
      setBusy('');
    }
  };

  if (!payload) {
    return <div className="stack">{error && <div className="error">{error}</div>}<LoadingState label="Loading Ontario regulatory foundation…" /></div>;
  }

  return <div className="stack">
    {error && <div className="error">{error}</div>}

    <section className="card">
      <div className="rowBetween">
        <div>
          <h2 className="sectionTitle">Ontario, Canada — employment & payroll rules foundation</h2>
          <p className="muted">
            Verified-source regulatory registry and deterministic previews for major Ontario employment standards.
            Canadian payroll execution remains in the separate Payroll workspace.
          </p>
        </div>
        <button className="button secondary compact" onClick={() => askAi(
          'Explain the Ontario employment and payroll regulatory foundation, current blockers, source provenance and special-rule risks. Do not change payroll, employee entitlements, termination decisions or compliance status.',
        )}>✦ AI regulatory review</button>
      </div>
      <div className="row wrap">
        <span className="badge">ONTARIO · CANADA</span>
        <span className="badge">NOT CERTIFIED</span>
        <span className="badge">LIVE EFFECT: NONE</span>
        <span className="badge">{payload.version}</span>
      </div>
      <div className="error">
        Not legal advice. Special rules, exemptions, collective agreements, contracts and common-law rights can change
        outcomes. Independent Ontario employment-law/payroll validation is required before certification.
      </div>
    </section>

    <section className="card">
      <h3 className="sectionTitle">Coverage map</h3>
      <div className="grid4">
        <div className="metricCard"><div className="metricLabel">Registered sources</div><div className="metricValue">{payload.sources.length}</div></div>
        <div className="metricCard"><div className="metricLabel">Rule families</div><div className="metricValue">{payload.rules.length}</div></div>
        <div className="metricCard"><div className="metricLabel">Certification</div><div className="metricValue">NOT CERTIFIED</div></div>
        <div className="metricCard"><div className="metricLabel">Live HR/payroll effect</div><div className="metricValue">NONE</div></div>
      </div>
      <ul>{payload.majorCoverage.map((item) => <li key={item}>{item}</li>)}</ul>
    </section>

    <section className="card">
      <h3 className="sectionTitle">Employment Standards preview</h3>
      <form className="formGrid" onSubmit={(e: FormEvent) => { e.preventDefault(); void post('employment_standards', employmentForm); }}>
        <label><span>Effective date</span><input className="input" type="date" value={employmentForm.effectiveDate} onChange={(e) => setEmploymentForm({ ...employmentForm, effectiveDate: e.target.value })} /></label>
        <label><span>Regular hourly rate (CAD)</span><input className="input" type="number" min={0} step={0.01} value={employmentForm.regularHourlyRate} onChange={(e) => setEmploymentForm({ ...employmentForm, regularHourlyRate: Number(e.target.value) })} /></label>
        <label><span>Hours this work week</span><input className="input" type="number" min={0} step={0.25} value={employmentForm.workWeekHours} onChange={(e) => setEmploymentForm({ ...employmentForm, workWeekHours: Number(e.target.value) })} /></label>
        <label><span>Service years</span><input className="input" type="number" min={0} step={0.01} value={employmentForm.serviceYears} onChange={(e) => setEmploymentForm({ ...employmentForm, serviceYears: Number(e.target.value) })} /></label>
        <label><span>Gross wages for vacation-pay preview</span><input className="input" type="number" min={0} step={0.01} value={employmentForm.vacationGrossWages} onChange={(e) => setEmploymentForm({ ...employmentForm, vacationGrossWages: Number(e.target.value) })} /></label>
        <label><span>Regular wages in prior 4 work weeks</span><input className="input" type="number" min={0} step={0.01} value={employmentForm.publicHolidayRegularWages4Weeks} onChange={(e) => setEmploymentForm({ ...employmentForm, publicHolidayRegularWages4Weeks: Number(e.target.value) })} /></label>
        <label><span>Vacation pay payable in prior 4 work weeks</span><input className="input" type="number" min={0} step={0.01} value={employmentForm.publicHolidayVacationPay4Weeks} onChange={(e) => setEmploymentForm({ ...employmentForm, publicHolidayVacationPay4Weeks: Number(e.target.value) })} /></label>
        <button className="button" disabled={Boolean(busy)}>{busy === 'employment_standards' ? 'Previewing…' : 'Preview Ontario standards'}</button>
      </form>

      {employment && <div className="stack" style={{ marginTop: 12 }}>
        <div className="row wrap">
          <span className="badge">{employment.status.replaceAll('_', ' ')}</span>
          <span><strong>Certification:</strong> {employment.certification} · <strong>Live effect:</strong> {employment.liveEffect}</span>
        </div>
        {'blockers' in employment && employment.blockers.length > 0 && <div className="error"><ul>{employment.blockers.map((item) => <li key={item}>{item}</li>)}</ul></div>}
        {'minimumWage' in employment && employment.minimumWage && <div className="grid4">
          <div className="metricCard"><div className="metricLabel">General minimum wage</div><div className="metricValue">{money(employment.minimumWage.rate)}</div><div className="metricFoot">{employment.minimumWage.period}</div></div>
          <div className="metricCard"><div className="metricLabel">Overtime</div><div className="metricValue">{employment.overtimeHours} h</div><div className="metricFoot">{money(employment.overtimeRate)} / h · {money(employment.overtimePay)} total</div></div>
          <div className="metricCard"><div className="metricLabel">Vacation foundation</div><div className="metricValue">{employment.vacationWeeks} weeks</div><div className="metricFoot">{(employment.vacationRate * 100).toFixed(0)}% · {money(employment.vacationPay)}</div></div>
          <div className="metricCard"><div className="metricLabel">Public-holiday pay</div><div className="metricValue">{money(employment.publicHolidayPay)}</div><div className="metricFoot">prior 4 work weeks ÷ 20 foundation</div></div>
        </div>}
        {'generalDailyHoursLimit' in employment && <div className="notice">
          General hours foundation: {employment.generalDailyHoursLimit} hours/day · {employment.generalWeeklyHoursLimit} hours/week ·
          {' '}{employment.mealBreakMinutes}-minute eating period after no more than {employment.mealBreakAfterConsecutiveHours} consecutive hours.
        </div>}
        <ul>{employment.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
      </div>}
    </section>

    <section className="card">
      <h3 className="sectionTitle">Termination & severance foundation preview</h3>
      <form className="formGrid" onSubmit={(e: FormEvent) => { e.preventDefault(); void post('separation', separationForm); }}>
        <label><span>Service years</span><input className="input" type="number" min={0} step={0.01} value={separationForm.serviceYears} onChange={(e) => setSeparationForm({ ...separationForm, serviceYears: Number(e.target.value) })} /></label>
        <label><span>Regular weekly wage (CAD)</span><input className="input" type="number" min={0} step={0.01} value={separationForm.regularWeeklyWage} onChange={(e) => setSeparationForm({ ...separationForm, regularWeeklyWage: Number(e.target.value) })} /></label>
        <label><span>ESA severance eligibility reviewed by qualified human</span><select className="input" value={separationForm.severanceEligibilityReviewed ? 'yes' : 'no'} onChange={(e) => setSeparationForm({ ...separationForm, severanceEligibilityReviewed: e.target.value === 'yes' })}><option value="no">No</option><option value="yes">Yes</option></select></label>
        <label><span>Qualified for ESA severance after review</span><select className="input" value={separationForm.severanceQualifies ? 'yes' : 'no'} onChange={(e) => setSeparationForm({ ...separationForm, severanceQualifies: e.target.value === 'yes' })}><option value="no">No</option><option value="yes">Yes</option></select></label>
        <button className="button" disabled={Boolean(busy)}>{busy === 'separation' ? 'Previewing…' : 'Preview statutory foundation'}</button>
      </form>

      {separation && <div className="stack" style={{ marginTop: 12 }}>
        <div className="row wrap">
          <span className="badge">{separation.status.replaceAll('_', ' ')}</span>
          <span><strong>Certification:</strong> {separation.certification} · <strong>Live effect:</strong> {separation.liveEffect}</span>
        </div>
        {separation.blockers.length > 0 && <div className="error"><ul>{separation.blockers.map((item) => <li key={item}>{item}</li>)}</ul></div>}
        <div className="grid4">
          <div className="metricCard"><div className="metricLabel">ESA notice foundation</div><div className="metricValue">{separation.noticeWeeks ?? '—'} weeks</div></div>
          <div className="metricCard"><div className="metricLabel">Notice-pay foundation</div><div className="metricValue">{money(separation.noticePayFoundation)}</div></div>
          <div className="metricCard"><div className="metricLabel">Severance status</div><div className="metricValue">{separation.severanceStatus.replaceAll('_', ' ')}</div></div>
          <div className="metricCard"><div className="metricLabel">Severance foundation</div><div className="metricValue">{money(separation.severancePay)}</div><div className="metricFoot">{separation.severanceWeeks ?? '—'} weeks</div></div>
        </div>
        <ul>{separation.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
      </div>}
    </section>

    <section className="card tableWrap">
      <h3 className="sectionTitle">Ontario regulatory rule registry</h3>
      <table>
        <thead><tr><th>Rule family</th><th>Coverage state</th><th>Foundation interpretation</th><th>Source</th></tr></thead>
        <tbody>{payload.rules.map((rule) => <tr key={rule.id}>
          <td><strong>{rule.label}</strong><div className="muted">{rule.id}</div></td>
          <td><span className="badge">{rule.state.replaceAll('_', ' ')}</span></td>
          <td>{rule.detail}</td>
          <td>{rule.sourceId}</td>
        </tr>)}</tbody>
      </table>
    </section>

    <section className="card tableWrap">
      <h3 className="sectionTitle">Official source registry</h3>
      <table>
        <thead><tr><th>Authority / source</th><th>Category</th><th>Evidence boundary</th></tr></thead>
        <tbody>{payload.sources.map((source) => <tr key={source.id}>
          <td><a href={source.url} target="_blank" rel="noreferrer"><strong>{source.title}</strong></a><div className="muted">{source.authority} · {source.id}</div></td>
          <td>{source.category}</td>
          <td>{source.note}</td>
        </tr>)}</tbody>
      </table>
    </section>

    <section className="card">
      <h3 className="sectionTitle">2026 Canadian payroll regulatory reference</h3>
      <div className="grid4">
        <div className="metricCard"><div className="metricLabel">CPP YMPE</div><div className="metricValue">{money(payload.payrollReference2026.cpp.ympe)}</div><div className="metricFoot">5.95% combined base + first additional employee/employer rate</div></div>
        <div className="metricCard"><div className="metricLabel">CPP2 YAMPE</div><div className="metricValue">{money(payload.payrollReference2026.cpp.yampe)}</div><div className="metricFoot">4.00% second additional rate</div></div>
        <div className="metricCard"><div className="metricLabel">EI max insurable</div><div className="metricValue">{money(payload.payrollReference2026.ei.maxInsurableEarnings)}</div><div className="metricFoot">1.63% employee · 2.282% employer</div></div>
        <div className="metricCard"><div className="metricLabel">Execution surface</div><div className="metricValue">PAYROLL</div><div className="metricFoot">Not duplicated in Country Compliance</div></div>
      </div>
    </section>

    <section className="card">
      <h3 className="sectionTitle">Certification gates still open</h3>
      <ul>{payload.openCertificationGates.map((gate) => <li key={gate}>{gate}</li>)}</ul>
    </section>
  </div>;
}