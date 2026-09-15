'use client';

import { useEffect, useState } from 'react';
import { activeOrgId, apiFetch } from '@/lib/http/client';

const today = () => new Date().toISOString().slice(0, 10);
const cad = (n?: number, c = 'CAD') =>
  typeof n === 'number'
    ? new Intl.NumberFormat('en-CA', { style: 'currency', currency: c, maximumFractionDigits: 2 }).format(n)
    : '—';
const askAi = (prompt: string) =>
  window.dispatchEvent(new CustomEvent('opsiqo:ai-assist', { detail: { prompt } }));

export function CompensationOperationalClosure() {
  const [intel, setIntel] = useState<any>(null);
  const [readiness, setReadiness] = useState<any>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');
  const [reviewNote, setReviewNote] = useState('');

  const [change, setChange] = useState({
    workerId: '',
    proposedPayBasis: 'annual_salary',
    proposedBasePay: '',
    currency: 'CAD',
    effectiveDate: today(),
    reason: 'market',
    rationale: '',
    standardHoursPerWeek: '40',
    standardWeeksPerYear: '52',
    evidenceRefs: '',
  });

  const load = async () => {
    try {
      setError('');
      const [i, r] = await Promise.all([
        apiFetch<{ data: any }>(`/api/organizations/${activeOrgId()}/compensation/intelligence`),
        apiFetch<{ data: any }>(`/api/organizations/${activeOrgId()}/compensation/readiness`),
      ]);
      setIntel(i.data);
      setReadiness(r.data);
      const first = i.data.flags?.find((x: any) => Number(x.annualPay || 0) > 0);
      setChange((x) => x.workerId ? x : {
        ...x,
        workerId: first?.workerId || '',
        proposedBasePay: first?.annualPay ? String(first.annualPay) : '',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load Compensation Operational Closure.');
    }
  };

  useEffect(() => { void load(); }, []);

  const intelligenceAction = async (body: any, success: string) => {
    setBusy(body.action || 'action');
    setError('');
    setMessage('');
    try {
      await apiFetch(`/api/organizations/${activeOrgId()}/compensation/intelligence`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setMessage(success);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Compensation action failed.');
    } finally {
      setBusy('');
    }
  };

  const readinessAction = async (body: any, success: string) => {
    setBusy(body.action || 'readiness');
    setError('');
    setMessage('');
    try {
      await apiFetch(`/api/organizations/${activeOrgId()}/compensation/readiness`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setMessage(success);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Compensation readiness action failed.');
    } finally {
      setBusy('');
    }
  };

  const reviewSync = async (workerId: string) => {
    setBusy(`sync:${workerId}`);
    setError('');
    setMessage('');
    try {
      await apiFetch(`/api/organizations/${activeOrgId()}/compensation/operational-closure`, {
        method: 'POST',
        body: JSON.stringify({ action: 'review_sync', workerId, note: reviewNote }),
      });
      setMessage('Compensation → Payroll synchronization reviewed and audit logged. No payroll value was silently changed.');
      setReviewNote('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to review compensation/payroll synchronization.');
    } finally {
      setBusy('');
    }
  };

  const createChange = () => intelligenceAction({
    action: 'create_change',
    input: {
      ...change,
      proposedBasePay: Number(change.proposedBasePay),
      standardHoursPerWeek: Number(change.standardHoursPerWeek || 40),
      standardWeeksPerYear: Number(change.standardWeeksPerYear || 52),
      evidenceRefs: change.evidenceRefs.split(',').map((x) => x.trim()).filter(Boolean),
    },
  }, 'Compensation change request created in Draft. It must pass Submit → HR Review → independent approval → effective-date application.');

  if (!intel || !readiness) return <div className="notice">Loading Compensation Operational Closure…</div>;

  const currentFlag = intel.flags.find((x: any) => x.workerId === change.workerId);

  return <div className="stack" style={{ marginTop: 18 }}>
    <div className="rowBetween">
      <div>
        <h2 className="sectionTitle">Operational Closure</h2>
        <p className="muted">
          One authoritative readiness definition, direct worker remediation, governed compensation-change actions,
          and explicit human review of Compensation → Payroll synchronization.
        </p>
      </div>
      <button className="button secondary compact" onClick={() => askAi(
        'Review Compensation Operational Closure. Explain employee mapping gaps, missing pay, salary-band issues, payroll-profile blockers, compensation change requests, sync-review items, budget impact and pay-equity indicators. Recommend governed next actions only; never approve or change pay.',
      )}>✦ Explain next actions</button>
    </div>

    {error && <div className="error">{error}</div>}
    {message && <div className="success">{message}</div>}

    <section className="card stack">
      <h3 className="sectionTitle">Authoritative Readiness Metrics</h3>
      <p className="muted">
        “Employee band mapping” means an active worker’s current position is mapped to a salary band.
        Architecture completeness below uses that single worker-level denominator; job-family/level design remains a separate architecture configuration concern.
      </p>
      <div className="grid4">
        <div className="metricCard"><div className="metricLabel">Workers in scope</div><div className="metricValue">{readiness.counts.workers}</div></div>
        <div className="metricCard"><div className="metricLabel">Missing current compensation</div><div className="metricValue">{readiness.counts.missingCompensation}</div></div>
        <div className="metricCard"><div className="metricLabel">Employee band mappings missing</div><div className="metricValue">{readiness.counts.missingBand}</div><div className="metricFoot">Architecture: {readiness.health.architecturePct}%</div></div>
        <div className="metricCard"><div className="metricLabel">Payroll readiness</div><div className="metricValue">{readiness.health.payrollReadinessPct}%</div><div className="metricFoot">{readiness.counts.readyForPayroll}/{readiness.counts.workers} workers</div></div>
      </div>
    </section>

    <section className="card stack">
      <h3 className="sectionTitle">Worker Remediation Hub</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ minWidth: 1180 }}>
          <thead><tr><th>Employee</th><th>Position</th><th>Hourly</th><th>Monthly</th><th>Annual</th><th>Blockers</th><th>Band</th><th>Comp → Payroll</th><th>Next action</th></tr></thead>
          <tbody>{readiness.workers.map((w: any) => <tr key={w.workerId}>
            <td style={{ whiteSpace: 'nowrap' }}><strong>{w.displayName}</strong><div className="muted" style={{ whiteSpace: 'nowrap' }}>#{w.employeeNumber}</div></td>
            <td>{w.positionTitle || 'Missing current position'}</td>
            <td style={{ whiteSpace: 'nowrap' }}>{cad(w.hourlyRate, w.currency)}</td>
            <td style={{ whiteSpace: 'nowrap' }}>{cad(w.monthlyPay, w.currency)}</td>
            <td style={{ whiteSpace: 'nowrap' }}>{cad(w.annualPay, w.currency)}</td>
            <td>{w.issues.length ? w.issues.join('; ') : <span className="badge">Ready</span>}</td>
            <td>{w.suggestedBand ? <div><strong>{w.suggestedBand.code}</strong> · {w.suggestedBand.confidence}%<br/><button className="button compact" disabled={Boolean(busy)} onClick={() => readinessAction({ action: 'apply_band_mapping', workerId: w.workerId, bandId: w.suggestedBand.bandId }, 'Suggested salary-band mapping applied after human review.')}>Review & apply band</button></div> : w.issues.includes('No salary band mapping') ? <button className="button secondary compact" onClick={() => window.dispatchEvent(new CustomEvent('opsiqo:compensation-open-architecture'))}>Map band</button> : '—'}</td>
            <td>{w.syncStatus ? <span className="badge">{String(w.syncStatus).replaceAll('_', ' ')}</span> : <span className="muted">No sync evidence</span>}</td>
            <td><div className="row">
              {w.issues.includes('Missing current position') && <button className="button compact" onClick={() => window.location.assign('/people')}>Add position</button>}
              {w.issues.includes('Missing current compensation') && <button className="button compact" onClick={() => window.dispatchEvent(new CustomEvent('opsiqo:compensation-open-employees'))}>Add compensation</button>}
              {w.issues.includes('Missing or disabled payroll profile') && <button className="button secondary compact" onClick={() => window.location.assign('/payroll')}>Review payroll profile</button>}
              {(w.syncStatus === 'payroll_review_required' || !w.syncStatus) && w.annualPay && <button className="button secondary compact" disabled={busy === `sync:${w.workerId}`} onClick={() => reviewSync(w.workerId)}>Review sync</button>}
            </div></td>
          </tr>)}</tbody>
        </table>
      </div>
      <label>Optional sync review note<input className="input" value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Evidence / reviewer note" /></label>
    </section>

    <section className="card stack">
      <h3 className="sectionTitle">Create Compensation Change</h3>
      <p className="muted">Preview current/proposed pay, salary-band position, annual budget impact, remaining-year impact and first affected payroll before approval.</p>
      <div className="grid4">
        <label>Worker<select className="input" value={change.workerId} onChange={(e) => {
          const f = intel.flags.find((x: any) => x.workerId === e.target.value);
          setChange({ ...change, workerId: e.target.value, proposedBasePay: f?.annualPay ? String(f.annualPay) : '' });
        }}><option value="">Select…</option>{intel.flags.filter((x: any) => Number(x.annualPay || 0) > 0).map((x: any) => <option key={x.workerId} value={x.workerId}>{x.displayName}</option>)}</select></label>
        <label>Pay basis<select className="input" value={change.proposedPayBasis} onChange={(e) => setChange({ ...change, proposedPayBasis: e.target.value })}><option value="annual_salary">Annual salary</option><option value="monthly_salary">Monthly salary</option><option value="hourly">Hourly</option></select></label>
        <label>Proposed amount<input className="input" type="number" step="0.01" value={change.proposedBasePay} onChange={(e) => setChange({ ...change, proposedBasePay: e.target.value })} /></label>
        <label>Effective date<input className="input" type="date" value={change.effectiveDate} onChange={(e) => setChange({ ...change, effectiveDate: e.target.value })} /></label>
        <label>Reason<select className="input" value={change.reason} onChange={(e) => setChange({ ...change, reason: e.target.value })}>{['merit','promotion','market','equity','adjustment','demotion','other'].map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Hours/week<input className="input" type="number" step="0.25" value={change.standardHoursPerWeek} onChange={(e) => setChange({ ...change, standardHoursPerWeek: e.target.value })} /></label>
        <label>Weeks/year<input className="input" type="number" step="0.1" value={change.standardWeeksPerYear} onChange={(e) => setChange({ ...change, standardWeeksPerYear: e.target.value })} /></label>
        <label>Evidence refs<input className="input" value={change.evidenceRefs} onChange={(e) => setChange({ ...change, evidenceRefs: e.target.value })} placeholder="APP-001, MKT-002" /></label>
      </div>
      <label>Rationale<textarea className="input" value={change.rationale} onChange={(e) => setChange({ ...change, rationale: e.target.value })} /></label>
      {currentFlag && <div className="notice"><strong>Current annual pay:</strong> {cad(currentFlag.annualPay)} · <strong>Current band status:</strong> {currentFlag.state.replaceAll('_',' ')} · <strong>Compa ratio:</strong> {currentFlag.compaRatioPct ? `${currentFlag.compaRatioPct}%` : '—'}</div>}
      <button className="button compact" disabled={Boolean(busy)} onClick={createChange}>Create governed change request</button>
    </section>

    <section className="card stack">
      <h3 className="sectionTitle">Compensation Change Workflow</h3>
      {(intel.pendingChanges || []).length === 0 ? <div className="notice">No pending compensation change requests.</div> :
      <div style={{ overflowX: 'auto' }}><table style={{ minWidth: 1200 }}>
        <thead><tr><th>Worker</th><th>Current</th><th>Proposed</th><th>Annual impact</th><th>Remaining-year</th><th>First payroll</th><th>Band</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>{intel.pendingChanges.map((x: any) => <tr key={x.id}>
          <td>{intel.workerDirectory.find((w: any) => w.id === x.workerId)?.displayName || x.workerId}</td>
          <td style={{ whiteSpace: 'nowrap' }}>{cad(x.currentAnnualPay, x.currency)}</td>
          <td style={{ whiteSpace: 'nowrap' }}>{cad(x.proposedAnnualPay, x.currency)}</td>
          <td style={{ whiteSpace: 'nowrap' }}>{cad(x.budgetImpactAnnual, x.currency)}</td>
          <td style={{ whiteSpace: 'nowrap' }}>{cad(x.budgetImpactRemainingYear, x.currency)}</td>
          <td style={{ whiteSpace: 'nowrap' }}>{x.firstAffectedPayrollDate || 'Requires payroll profile'}</td>
          <td>{x.bandStatus}{x.proposedCompaRatioPct ? ` · ${x.proposedCompaRatioPct}% CR` : ''}</td>
          <td><span className="badge">{x.status.replaceAll('_',' ')}</span></td>
          <td><div className="row">
            {x.status === 'draft' && <button className="button compact" onClick={() => intelligenceAction({ action: 'change_action', id: x.id, operation: 'submit' }, 'Compensation change submitted.')}>Submit</button>}
            {x.status === 'submitted' && <button className="button compact" onClick={() => intelligenceAction({ action: 'change_action', id: x.id, operation: 'send_to_hr' }, 'Compensation change sent to HR Review.')}>Send to HR</button>}
            {x.status === 'hr_review' && <><button className="button compact" onClick={() => intelligenceAction({ action: 'change_action', id: x.id, operation: 'approve' }, 'Compensation change approved by independent reviewer.')}>Approve</button><button className="button secondary compact" onClick={() => intelligenceAction({ action: 'change_action', id: x.id, operation: 'reject' }, 'Compensation change rejected.')}>Reject</button></>}
            {x.status === 'approved' && <button className="button compact" onClick={() => intelligenceAction({ action: 'change_action', id: x.id, operation: 'apply' }, 'Approved compensation change applied on/after its effective date and sent to explicit Payroll sync review.')}>Apply when effective</button>}
          </div></td>
        </tr>)}</tbody>
      </table></div>}
    </section>
  </div>;
}