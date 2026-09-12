'use client';

import { useEffect, useMemo, useState } from 'react';
import { LoadingState } from '@/components/data-states';
import { activeOrgId, apiFetch } from '@/lib/http/client';
import type {
  OntarioComplianceProfile,
} from '@/lib/country-compliance/ontario-readiness';

type Data = {
  profile: OntarioComplianceProfile;
  assessment: ReturnType<typeof import('@/lib/country-compliance/ontario-readiness').assessOntarioComplianceReadiness>;
  canManage: boolean;
};

const askAi = (prompt: string) =>
  window.dispatchEvent(new CustomEvent('opsiqo:ai-assist', { detail: { prompt } }));


export function OntarioComplianceReadiness() {
  const [data, setData] = useState<Data | null>(null);
  const [profile, setProfile] = useState<OntarioComplianceProfile | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setError('');
      const response = await apiFetch<{ data: Data }>(
        `/api/organizations/${activeOrgId()}/country-compliance/ontario/readiness`,
      );
      setData(response.data);
      setProfile(response.data.profile);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load Ontario compliance readiness.');
    }
  };

  useEffect(() => { void load(); }, []);

  const assessment = data?.assessment;
  const red = useMemo(
    () => assessment?.obligations.filter((item) => item.state !== 'complete' && item.severity === 'red') || [],
    [assessment],
  );

  const update = <K extends keyof OntarioComplianceProfile>(key: K, value: OntarioComplianceProfile[K]) => {
    if (!profile) return;
    setProfile({ ...profile, [key]: value });
  };

  const save = async () => {
    if (!profile) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await apiFetch<{ data: { profile: OntarioComplianceProfile; assessment: Data['assessment'] } }>(
        `/api/organizations/${activeOrgId()}/country-compliance/ontario/readiness`,
        {
          method: 'POST',
          body: JSON.stringify({ action: 'save_profile', input: profile }),
        },
      );
      setProfile(response.data.profile);
      setData((current) => current ? { ...current, profile: response.data.profile, assessment: response.data.assessment } : current);
      setMessage('Ontario compliance profile saved. No legal certification or live payroll/HR action was created.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save Ontario compliance profile.');
    } finally {
      setBusy(false);
    }
  };

  if (!data || !profile || !assessment) {
    return <div className="stack">{error && <div className="error">{error}</div>}<LoadingState label="Loading Ontario compliance intelligence…" /></div>;
  }

  const evidenceFields: Array<[keyof OntarioComplianceProfile, string]> = [
    ['disconnectingPolicyRef', 'Disconnecting-from-work policy evidence'],
    ['electronicMonitoringPolicyRef', 'Electronic-monitoring policy evidence'],
    ['jobPostingProcedureRef', '2026 job-posting governance / master procedure'],
    ['jobPostingCompensationRef', 'Compensation disclosure / range evidence'],
    ['jobPostingAiDisclosureRef', 'AI-use disclosure evidence'],
    ['jobPostingVacancyRef', 'Existing-vacancy disclosure evidence'],
    ['jobPostingCanadianExperienceRef', 'Canadian-experience prohibition control evidence'],
    ['interviewStatusProcedureRef', '45-day interviewed-applicant status procedure'],
    ['jobPostingRetentionRef', '3-year posting / interview-status retention evidence'],
    ['aodaComplianceReportRef', 'AODA compliance report evidence'],
    ['accessibilityPlanRef', 'Accessibility policies / multi-year plan'],
    ['hsrOrJhscRef', 'HSR / JHSC evidence'],
    ['payEquityReviewRef', 'Pay Equity review evidence'],
    ['recruiterLicenseReviewRef', 'Recruiter / THA licence verification'],
    ['wsibCoverageReviewRef', 'WSIB coverage/classification review'],
    ['ehtReviewRef', 'EHT review evidence'],
    ['collectiveAgreementReviewRef', 'Collective agreement review'],
    ['specialRulesReviewRef', 'ESA special rules/exemptions review'],
  ];

  return <div className="stack">
    {error && <div className="error">{error}</div>}
    {message && <div className="success">{message}</div>}

    <section className="card">
      <div className="rowBetween">
        <div>
          <h2 className="sectionTitle">Ontario Compliance Intelligence</h2>
          <p className="muted">
            Organization-level applicability, evidence readiness, change calendar and source-governed Ontario compliance controls.
            Readiness is not legal certification.
          </p>
        </div>
        <button className="button secondary compact" onClick={() => askAi(
          'Explain the Ontario compliance readiness blockers, upcoming regulatory dates and evidence gaps. Do not change legal status, payroll, leave balances, recruiting decisions, termination decisions, government filings or employee rights.',
        )}>✦ AI readiness review</button>
      </div>

      <div className="grid4">
        <div className="metricCard"><div className="metricLabel">Readiness</div><div className="metricValue">{assessment.readinessPercent}%</div><div className="metricFoot">implementation/evidence only</div></div>
        <div className="metricCard"><div className="metricLabel">Open red</div><div className="metricValue">{assessment.openRed}</div></div>
        <div className="metricCard"><div className="metricLabel">Overdue</div><div className="metricValue">{assessment.overdueCount}</div><div className="metricFoot">{assessment.dueSoonCount} due soon</div></div>
        <div className="metricCard"><div className="metricLabel">Certification</div><div className="metricValue">NOT CERTIFIED</div><div className="metricFoot">Live effect: NONE</div></div>
      </div>

      <div className="error">
        Not legal advice. This cockpit identifies likely obligations from the organization profile; it does not decide legal applicability where facts,
        exemptions, contracts, collective agreements or common-law rights require qualified review.
      </div>
    </section>

    <section className="card">
      <h3 className="sectionTitle">Organization applicability profile</h3>
      <div className="formGrid">
        <label><span>Organization type</span><select className="input" value={profile.orgType} onChange={(e) => update('orgType', e.target.value as OntarioComplianceProfile['orgType'])}>
          <option value="unknown">Requires review</option><option value="private">Private</option><option value="nonprofit">Non-profit</option><option value="public">Public sector</option>
        </select></label>
        <label><span>Current Ontario employee count</span><input className="input" type="number" min={0} value={profile.ontarioEmployeeCount} onChange={(e) => update('ontarioEmployeeCount', Number(e.target.value))} /></label>
        <label><span>Ontario employees on January 1</span><input className="input" type="number" min={0} value={profile.ontarioEmployeesOnJan1} onChange={(e) => update('ontarioEmployeesOnJan1', Number(e.target.value))} /></label>
        <label><span>January 1 employee-count snapshot reviewed</span><select className="input" value={profile.jan1EmployeeCountReviewed ? 'yes' : 'no'} onChange={(e) => update('jan1EmployeeCountReviewed', e.target.value === 'yes')}><option value="no">No / requires review</option><option value="yes">Yes</option></select></label>
        <label><span>Workers at this workplace</span><input className="input" type="number" min={0} value={profile.workplaceWorkerCount} onChange={(e) => update('workplaceWorkerCount', Number(e.target.value))} /></label>
        <label><span>Annual Ontario payroll (CAD)</span><input className="input" type="number" min={0} step={0.01} value={profile.annualOntarioPayrollCad} onChange={(e) => update('annualOntarioPayrollCad', Number(e.target.value))} /></label>
        <label><span>Associated-group Ontario payroll (CAD)</span><input className="input" type="number" min={0} step={0.01} value={profile.associatedGroupOntarioPayrollCad} onChange={(e) => update('associatedGroupOntarioPayrollCad', Number(e.target.value))} /></label>
        {([
          ['usesPublicJobPostings', 'Uses publicly advertised job postings'],
          ['usesAiInRecruiting', 'Uses AI to screen/assess/select applicants'],
          ['electronicallyMonitorsEmployees', 'Electronically monitors employees'],
          ['usesRecruitersOrTempAgencies', 'Uses recruiters / temporary-help agencies'],
          ['unionizedWorkplace', 'Unionized workplace'],
          ['registeredCharity', 'Registered charity'],
          ['ehtEligibleEmployerReviewed', 'EHT eligible-employer status human-reviewed'],
          ['ehtEligibleEmployer', 'EHT eligible employer after review'],
          ['specialRulesOrExemptionsReviewed', 'ESA special rules/exemptions reviewed'],
        ] as const).map(([key, label]) => <label key={key}><span>{label}</span><select className="input" value={profile[key] ? 'yes' : 'no'} onChange={(e) => update(key, (e.target.value === 'yes') as never)}><option value="no">No</option><option value="yes">Yes</option></select></label>)}
      </div>
      {data.canManage && <button className="button" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save applicability profile'}</button>}
    </section>

    <section className="card tableWrap">
      <div className="rowBetween">
        <div><h3 className="sectionTitle">Obligation matrix</h3><p className="muted">{assessment.completedObligations}/{assessment.actionableObligations} actionable obligations have evidence complete.</p></div>
        <span className="badge">{red.length} red open</span>
      </div>
      <table>
        <thead><tr><th>Obligation</th><th>Applicability</th><th>Operational status</th><th>Owner</th><th>Reason / next action</th><th>Due</th></tr></thead>
        <tbody>{assessment.obligations.map((item) => <tr key={item.id}>
          <td><strong>{item.label}</strong><div className="muted">{item.category} · {item.sourceId}</div></td>
          <td>{item.applicability.replaceAll('_', ' ')}</td>
          <td><span className="badge">{item.operationalStatus.replaceAll('_', ' ')}</span>{item.daysPastDue ? <div className="muted">{item.daysPastDue} days overdue</div> : item.daysUntilDue !== undefined ? <div className="muted">{item.daysUntilDue} days remaining</div> : null}</td>
          <td>{item.owner}</td>
          <td><div>{item.reason}</div><div className="muted"><strong>Next:</strong> {item.nextAction}</div></td>
          <td>{item.dueDate || '—'}</td>
        </tr>)}</tbody>
      </table>
    </section>

    <section className="card tableWrap">
      <div className="rowBetween">
        <div>
          <h3 className="sectionTitle">Priority remediation queue</h3>
          <p className="muted">Overdue and high-risk items are ranked before ordinary open items.</p>
        </div>
        <span className="badge">As of {assessment.asOfDate}</span>
      </div>
      <table>
        <thead><tr><th>Priority item</th><th>Status</th><th>Owner</th><th>Next action</th></tr></thead>
        <tbody>{assessment.remediationQueue.slice(0, 10).map((item) => <tr key={item.id}>
          <td><strong>{item.label}</strong></td>
          <td>{item.operationalStatus.replaceAll('_', ' ')}{item.daysPastDue ? ` · ${item.daysPastDue} days overdue` : ''}</td>
          <td>{item.owner}</td>
          <td>{item.nextAction}</td>
        </tr>)}</tbody>
      </table>
    </section>

    <section className="card tableWrap">
      <h3 className="sectionTitle">2026 recruiting compliance controls</h3>
      <p className="muted">These controls are evaluated separately when the general public-job-posting foundation applies.</p>
      <table>
        <thead><tr><th>Control</th><th>Foundation</th></tr></thead>
        <tbody>{assessment.recruitingControls.map((control) => <tr key={control.id}>
          <td><strong>{control.label}</strong></td>
          <td>{control.detail}</td>
        </tr>)}</tbody>
      </table>
    </section>

    <section className="card">
      <h3 className="sectionTitle">Evidence references</h3>
      <div className="formGrid">
        {evidenceFields.map(([key, label]) => <label key={String(key)}><span>{label}</span><input
          className="input"
          value={String(profile[key] || '')}
          onChange={(e) => update(key, e.target.value as never)}
          placeholder="Governed document / review / evidence reference"
        /></label>)}
      </div>
      {data.canManage && <button className="button" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save evidence references'}</button>}
    </section>

    <section className="card">
      <h3 className="sectionTitle">Ontario regulatory change calendar</h3>
      <div className="grid2">{assessment.changeCalendar.map((item) => <article className="metricCard" key={item.id}>
        <div className="metricLabel">{item.effectiveDate}</div>
        <div className="metricValue" style={{ fontSize: 18 }}>{item.label}</div>
        <div className="metricFoot">{item.detail}</div>
      </article>)}</div>
    </section>

    <section className="card">
      <h3 className="sectionTitle">Hours, rest & wage safeguards</h3>
      <div className="grid4">
        <div className="metricCard"><div className="metricLabel">Daily rest</div><div className="metricValue">{assessment.hoursRestFoundation.consecutiveDailyRestHours} h</div><div className="metricFoot">general consecutive rest foundation</div></div>
        <div className="metricCard"><div className="metricLabel">Between shifts</div><div className="metricValue">{assessment.hoursRestFoundation.betweenShiftRestHours} h</div><div className="metricFoot">exceptions/agreement rules apply</div></div>
        <div className="metricCard"><div className="metricLabel">Weekly rest</div><div className="metricValue">{assessment.hoursRestFoundation.weeklyRestHours} h</div><div className="metricFoot">or {assessment.hoursRestFoundation.biweeklyRestHours} h / 2 weeks</div></div>
        <div className="metricCard"><div className="metricLabel">OT threshold</div><div className="metricValue">{assessment.hoursRestFoundation.overtimeThresholdHours} h</div><div className="metricFoot">general ESA foundation</div></div>
      </div>
      <div className="notice">
        Current general minimum wage: ${assessment.minimumWageSchedule.currentThrough20260930.generalHourly.toFixed(2)}.
        From 2026-10-01: ${assessment.minimumWageSchedule.effective20261001Through20270930.generalHourly.toFixed(2)}.
        Student and guide specialized rates are separately registered.
      </div>
    </section>

    <section className="card tableWrap">
      <h3 className="sectionTitle">Ontario statutory leave catalogue</h3>
      <p className="muted">Registry only. Every leave remains case-reviewed; no leave balance or approval is created here.</p>
      <table>
        <thead><tr><th>Leave</th><th>Foundation entitlement</th><th>Eligibility foundation</th><th>Paid foundation</th></tr></thead>
        <tbody>{assessment.leaveCatalogue.map((leave) => <tr key={leave.id}>
          <td><a href={leave.sourceUrl} target="_blank" rel="noreferrer"><strong>{leave.label}</strong></a></td>
          <td>{leave.foundationEntitlement}</td>
          <td>{leave.eligibilityFoundation}</td>
          <td>{leave.paidFoundation}</td>
        </tr>)}</tbody>
      </table>
    </section>

    <section className="card tableWrap">
      <h3 className="sectionTitle">Verified-source freshness</h3>
      <table>
        <thead><tr><th>Source</th><th>Category</th><th>Observed</th><th>Status</th></tr></thead>
        <tbody>{assessment.sourceFreshness.map((source) => <tr key={source.id}>
          <td><a href={source.url} target="_blank" rel="noreferrer"><strong>{source.title}</strong></a><div className="muted">{source.id}</div></td>
          <td>{source.category}</td>
          <td>{source.observedAt}</td>
          <td><span className="badge">{source.status.replaceAll('_', ' ')}</span></td>
        </tr>)}</tbody>
      </table>
    </section>
  </div>;
}