'use client';

import { useEffect, useMemo, useState } from 'react';
import { activeOrgId, apiFetch } from '@/lib/http/client';
import { LoadingState } from '@/components/data-states';
import type {
  SaudiPayrollGuardEvidence,
  SaudiWorkerPayrollReview,
} from '@/lib/payroll/saudi-payroll-guard';
import type {
  SaudiSocialInsuranceRegime,
  SaudiSanedApplicability,
} from '@/lib/strategic/saudi-country-pack';

type GuardData = {
  version: string;
  certification: 'NOT_CERTIFIED';
  productionReadiness: 'BLOCKED';
  productionReleaseEnabled: false;
  governmentSubmissionEnabled: false;
  aiPayrollReleaseAllowed: false;
  canManage: boolean;
  evidence: SaudiPayrollGuardEvidence;
  evidenceIssues: string[];
  evidenceComplete: number;
  evidenceRequired: number;
  reviewedWorkers: number;
  readyReviewedWorkers: number;
  workers: Array<{
    workerId: string;
    displayName: string;
    employeeNumber?: string;
    scope: 'SAUDI_REVIEWED' | 'NOT_ASSESSED';
    workerInputsReady: boolean;
    blockers: string[];
    warnings: string[];
    releaseRule: string;
    compensation?: {
      currency: string;
      hourlyRate?: number;
      monthlyPay?: number;
      annualPay?: number;
    };
    review?: SaudiWorkerPayrollReview;
  }>;
  sources: Array<{ id: string; title: string; url: string; note: string }>;
  goldenCases: Array<{
    id: string;
    label: string;
    pass: boolean;
    approvalState: 'FOUNDATION_UNAPPROVED';
  }>;
  arabicStatusPreview: {
    direction: 'rtl';
    notCertified: string;
    payrollReleaseBlocked: string;
    governmentSubmissionDisabled: string;
    humanReviewRequired: string;
  };
};

const money = (value?: number, currency = 'SAR') =>
  typeof value === 'number'
    ? new Intl.NumberFormat('en-SA', { style: 'currency', currency, minimumFractionDigits: 2 }).format(value)
    : '—';

const askAi = (prompt: string) =>
  window.dispatchEvent(new CustomEvent('opsiqo:ai-assist', { detail: { prompt } }));

export function SaudiPayrollGuardPanel() {
  const [data, setData] = useState<GuardData | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [evidence, setEvidence] = useState<SaudiPayrollGuardEvidence>({ id: 'current' });
  const [review, setReview] = useState({
    saudiNationalConfirmed: false,
    regime: 'requires_review' as SaudiSocialInsuranceRegime,
    sanedApplicable: 'requires_review' as SaudiSanedApplicability,
    contributoryWageSar: 10000,
    note: '',
  });

  const load = async () => {
    try {
      setError('');
      const response = await apiFetch<{ data: GuardData }>(
        `/api/organizations/${activeOrgId()}/payroll/saudi-guard`,
      );
      setData(response.data);
      setEvidence(response.data.evidence || { id: 'current' });
      if (!selectedWorkerId && response.data.workers.length) {
        setSelectedWorkerId(response.data.workers[0].workerId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load Saudi Payroll Guard.');
    }
  };

  useEffect(() => { void load(); }, []);

  const selectedWorker = useMemo(
    () => data?.workers.find((worker) => worker.workerId === selectedWorkerId),
    [data, selectedWorkerId],
  );

  useEffect(() => {
    if (!selectedWorker) return;
    if (selectedWorker.review) {
      setReview({
        saudiNationalConfirmed: selectedWorker.review.saudiNationalConfirmed,
        regime: selectedWorker.review.regime,
        sanedApplicable: selectedWorker.review.sanedApplicable,
        contributoryWageSar: selectedWorker.review.contributoryWageSar,
        note: selectedWorker.review.note || '',
      });
    } else {
      setReview({
        saudiNationalConfirmed: false,
        regime: 'requires_review',
        sanedApplicable: 'requires_review',
        contributoryWageSar: selectedWorker.compensation?.monthlyPay || 10000,
        note: '',
      });
    }
  }, [selectedWorkerId, selectedWorker?.review?.reviewedAt]);

  const saveEvidence = async () => {
    setBusy('evidence'); setError(''); setMessage('');
    try {
      await apiFetch(`/api/organizations/${activeOrgId()}/payroll/saudi-guard`, {
        method: 'POST',
        body: JSON.stringify({ action: 'save_evidence', input: evidence }),
      });
      setMessage('Saudi Payroll Guard evidence references saved. Production release remains blocked.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save Saudi Payroll Guard evidence.');
    } finally { setBusy(''); }
  };

  const saveWorkerReview = async () => {
    if (!selectedWorkerId) return;
    setBusy('worker'); setError(''); setMessage('');
    try {
      await apiFetch(`/api/organizations/${activeOrgId()}/payroll/saudi-guard`, {
        method: 'POST',
        body: JSON.stringify({ action: 'save_worker_review', workerId: selectedWorkerId, input: review }),
      });
      setMessage('Human-reviewed Saudi worker payroll inputs saved. No payroll record or release was created.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save Saudi worker payroll review.');
    } finally { setBusy(''); }
  };

  if (!data) return <div className="stack">{error && <div className="error">{error}</div>}<LoadingState label="Loading Saudi Payroll Guard…" /></div>;

  const field = (
    key: keyof SaudiPayrollGuardEvidence,
    label: string,
  ) => <label><span>{label}</span><input
    className="input"
    value={String(evidence[key] || '')}
    onChange={(e) => setEvidence({ ...evidence, [key]: e.target.value })}
    placeholder="Evidence/reference ID or governed document reference"
  /></label>;

  return <section className="card stack">
    <div className="rowBetween">
      <div>
        <h2 className="sectionTitle">Saudi Payroll Guard</h2>
        <p className="muted">
          Production-readiness pre-flight for Saudi payroll. This H51.42 control layer stores review evidence only.
          It does not calculate live Saudi payroll, release payroll, submit WPS files, or call Saudi government systems.
        </p>
      </div>
      <button className="button secondary compact" onClick={() => askAi(
        'Explain the current Saudi Payroll Guard blockers and evidence gaps. Do not release payroll, change worker pay, infer GOSI regime, or perform a government submission.',
      )}>✦ AI guard review</button>
    </div>

    {error && <div className="error">{error}</div>}
    {message && <div className="success">{message}</div>}

    <div className="grid4">
      <div className="metricCard"><div className="metricLabel">Saudi certification</div><div className="metricValue">NOT CERTIFIED</div></div>
      <div className="metricCard"><div className="metricLabel">Production readiness</div><div className="metricValue">BLOCKED</div></div>
      <div className="metricCard"><div className="metricLabel">Payroll release</div><div className="metricValue">HUMAN ONLY</div><div className="metricFoot">AI release blocked</div></div>
      <div className="metricCard"><div className="metricLabel">Government submission</div><div className="metricValue">DISABLED</div></div>
    </div>

    <div className="notice">
      <strong>Hard boundary:</strong> H51.42 cannot enable production Saudi payroll. Even when all evidence fields are completed,
      production release and government submission remain disabled until a later independently certified release.
    </div>

    <section className="card">
      <div className="rowBetween">
        <div><h3 className="sectionTitle">Production-readiness evidence</h3><div className="muted">{data.evidenceComplete}/{data.evidenceRequired} evidence gates populated</div></div>
        <span className="badge">Human governed</span>
      </div>
      <div className="formGrid">
        {field('legalReviewRef', 'Independent Saudi legal/compliance review')}
        {field('payrollValidationRef', 'Independent payroll validation')}
        {field('goldenPayrollEvidenceRef', 'Approved golden-payroll evidence')}
        {field('arabicRtlQaEvidenceRef', 'Arabic/RTL critical-flow QA')}
        {field('wpsReadinessEvidenceRef', 'WPS readiness/compliance evidence')}
        {field('governmentConnectorCertificationRef', 'Government connector certification')}
      </div>
      {data.canManage && <button className="button" disabled={Boolean(busy)} onClick={saveEvidence}>{busy === 'evidence' ? 'Saving…' : 'Save evidence references'}</button>}
      {data.evidenceIssues.length > 0 && <div className="error"><strong>Open evidence blockers</strong><ul>{data.evidenceIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div>}
    </section>

    <section className="card">
      <h3 className="sectionTitle">Human-reviewed worker guard</h3>
      <div className="formGrid">
        <label><span>Worker</span><select className="input" value={selectedWorkerId} onChange={(e) => setSelectedWorkerId(e.target.value)}>
          {data.workers.map((worker) => <option key={worker.workerId} value={worker.workerId}>{worker.displayName} {worker.employeeNumber ? `· ${worker.employeeNumber}` : ''}</option>)}
        </select></label>
        <label><span>Saudi national confirmed by authorized human</span><select className="input" value={review.saudiNationalConfirmed ? 'yes' : 'no'} onChange={(e) => setReview({ ...review, saudiNationalConfirmed: e.target.value === 'yes' })}>
          <option value="no">No / not confirmed</option><option value="yes">Yes, confirmed</option>
        </select></label>
        <label><span>GOSI regime (human selected)</span><select className="input" value={review.regime} onChange={(e) => setReview({ ...review, regime: e.target.value as SaudiSocialInsuranceRegime })}>
          <option value="requires_review">Requires qualified review</option>
          <option value="new_1445_no_prior_subscription">New 1445 system · no prior subscription before 2024-07-03</option>
          <option value="existing_unaffected">Existing unaffected category</option>
        </select></label>
        <label><span>SANED applicability</span><select className="input" value={review.sanedApplicable} onChange={(e) => setReview({ ...review, sanedApplicable: e.target.value as SaudiSanedApplicability })}>
          <option value="requires_review">Requires qualified review</option><option value="yes">Applicable</option><option value="no">Not applicable</option>
        </select></label>
        <label><span>Contributory wage (SAR)</span><input className="input" type="number" min={0.01} step={0.01} value={review.contributoryWageSar} onChange={(e) => setReview({ ...review, contributoryWageSar: Number(e.target.value) })} /></label>
        <label><span>Human-review note</span><input className="input" value={review.note} onChange={(e) => setReview({ ...review, note: e.target.value })} /></label>
      </div>
      {data.canManage && <button className="button" disabled={Boolean(busy) || !selectedWorkerId} onClick={saveWorkerReview}>{busy === 'worker' ? 'Saving…' : 'Save worker guard review'}</button>}
      {selectedWorker && <div className="stack" style={{ marginTop: 12 }}>
        <div className="row wrap">
          <span className="badge">{selectedWorker.scope.replaceAll('_', ' ')}</span>
          <span className="badge">{selectedWorker.workerInputsReady ? 'Worker inputs ready for validation' : 'Blocked'}</span>
        </div>
        <div className="grid4">
          <div className="metricCard"><div className="metricLabel">Monthly compensation context</div><div className="metricValue">{money(selectedWorker.compensation?.monthlyPay, selectedWorker.compensation?.currency || 'SAR')}</div></div>
          <div className="metricCard"><div className="metricLabel">Currency</div><div className="metricValue">{selectedWorker.compensation?.currency || '—'}</div></div>
          <div className="metricCard"><div className="metricLabel">Release rule</div><div className="metricFoot">{selectedWorker.releaseRule}</div></div>
          <div className="metricCard"><div className="metricLabel">Production-ready</div><div className="metricValue">NO</div></div>
        </div>
        {selectedWorker.blockers.length > 0 && <div className="error"><ul>{selectedWorker.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></div>}
      </div>}
    </section>

    <section className="card tableWrap">
      <div className="rowBetween"><h3 className="sectionTitle">Golden-payroll foundation cases</h3><span className="badge">UNAPPROVED</span></div>
      <table><thead><tr><th>Case</th><th>Deterministic result</th><th>Independent approval</th></tr></thead>
      <tbody>{data.goldenCases.map((testCase) => <tr key={testCase.id}><td>{testCase.label}<div className="muted">{testCase.id}</div></td><td>{testCase.pass ? 'PASS' : 'FAIL'}</td><td>{testCase.approvalState.replaceAll('_', ' ')}</td></tr>)}</tbody></table>
    </section>

    <section className="card">
      <h3 className="sectionTitle">Arabic critical-status preview</h3>
      <div dir="rtl" style={{ textAlign: 'right' }}>
        <strong>{data.arabicStatusPreview.notCertified}</strong> · {data.arabicStatusPreview.payrollReleaseBlocked} · {data.arabicStatusPreview.governmentSubmissionDisabled} · {data.arabicStatusPreview.humanReviewRequired}
      </div>
      <p className="muted">Preview only. Arabic/RTL certification remains an open evidence gate.</p>
    </section>

    <section className="card tableWrap">
      <h3 className="sectionTitle">Official WPS / wage-control provenance</h3>
      <table><thead><tr><th>Source</th><th>Evidence boundary</th></tr></thead>
      <tbody>{data.sources.map((source) => <tr key={source.id}><td><a href={source.url} target="_blank" rel="noreferrer"><strong>{source.title}</strong></a><div className="muted">{source.id}</div></td><td>{source.note}</td></tr>)}</tbody></table>
    </section>
  </section>;
}