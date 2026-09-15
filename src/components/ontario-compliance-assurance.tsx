'use client';

import { useEffect, useMemo, useState } from 'react';
import { LoadingState } from '@/components/data-states';
import { activeOrgId, apiFetch } from '@/lib/http/client';
import type {
  OntarioComplianceEvidence,
  OntarioComplianceTask,
} from '@/lib/country-compliance/ontario-assurance';
import type { OntarioReadinessObligation } from '@/lib/country-compliance/ontario-readiness';

type EvidenceRow = OntarioComplianceEvidence & { operationalStatus: string };

type Data = {
  assessment: ReturnType<typeof import('@/lib/country-compliance/ontario-readiness').assessOntarioComplianceReadiness>;
  assurance: ReturnType<typeof import('@/lib/country-compliance/ontario-assurance').computeOntarioAssurance>;
  evidence: EvidenceRow[];
  tasks: OntarioComplianceTask[];
  canManage: boolean;
  asOfDate: string;
};

const askAi = (prompt: string) =>
  window.dispatchEvent(new CustomEvent('opsiqo:ai-assist', { detail: { prompt } }));

const priorityOrder = { critical: 0, high: 1, medium: 2 } as const;

export function OntarioComplianceAssurance() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [obligationId, setObligationId] = useState('');
  const [title, setTitle] = useState('');
  const [reference, setReference] = useState('');
  const [reviewDueDate, setReviewDueDate] = useState('');
  const [reviewNote, setReviewNote] = useState('');

  const endpoint = `/api/organizations/${activeOrgId()}/country-compliance/ontario/assurance`;

  const load = async () => {
    try {
      setError('');
      const response = await apiFetch<{ data: Data }>(endpoint);
      setData(response.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load Ontario assurance controls.');
    }
  };

  useEffect(() => { void load(); }, []);

  const actionable = useMemo(
    () => data?.assessment.obligations.filter((item) => item.applicability !== 'not_applicable') || [],
    [data],
  );

  const tasks = useMemo(
    () => [...(data?.tasks || [])].sort((a, b) =>
      priorityOrder[a.priority] - priorityOrder[b.priority] || a.label.localeCompare(b.label)),
    [data],
  );

  const mutate = async (action: string, input?: unknown, success?: string) => {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await apiFetch<{ data: Data }>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ action, input }),
      });
      setData(response.data);
      if (success) setMessage(success);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ontario assurance action failed.');
    } finally {
      setBusy(false);
    }
  };

  const submitEvidence = async () => {
    if (!obligationId || !title.trim() || !reference.trim()) {
      setError('Choose an obligation and provide an evidence title and governed reference.');
      return;
    }
    await mutate('submit_evidence', {
      obligationId,
      title,
      reference,
      reviewDueDate: reviewDueDate || undefined,
    }, 'Evidence submitted for human review. It does not count as approved assurance evidence yet.');
    setTitle(''); setReference(''); setReviewDueDate('');
  };

  const reviewEvidence = async (evidenceId: string, decision: 'approved' | 'rejected') => {
    await mutate('review_evidence', {
      evidenceId,
      decision,
      reviewNote,
    }, decision === 'approved'
      ? 'Evidence approved. Linked remediation tasks may now complete automatically.'
      : 'Evidence rejected. The obligation remains open.');
    setReviewNote('');
  };

  const updateTask = async (taskId: string, status: 'open' | 'in_progress' | 'blocked') => {
    await mutate('update_task', { taskId, status }, `Task moved to ${status.replaceAll('_', ' ')}.`);
  };

  if (!data) {
    return <div className="stack">{error && <div className="error">{error}</div>}<LoadingState label="Loading Ontario evidence assurance…" /></div>;
  }

  return <div className="stack">
    {error && <div className="error">{error}</div>}
    {message && <div className="success">{message}</div>}

    <section className="card">
      <div className="rowBetween">
        <div>
          <h2 className="sectionTitle">Ontario Evidence Assurance & Remediation</h2>
          <p className="muted">
            Governed evidence review and compliance-task orchestration. Evidence must be human-approved before it counts toward assurance readiness.
          </p>
        </div>
        <div className="row">
          {data.canManage && <button className="button compact" disabled={busy} onClick={() => mutate(
            'sync_tasks',
            undefined,
            'Remediation tasks synchronized with the current Ontario obligation state.',
          )}>{busy ? 'Working…' : 'Create / refresh remediation tasks'}</button>}
          <button className="button secondary compact" onClick={() => askAi(
            'Build a prioritized Ontario compliance action plan from the current assurance gaps, overdue tasks and pending evidence. Explain only; do not approve evidence, complete tasks, change legal status, post payroll, alter leave balances, make employment decisions or submit government filings.',
          )}>✦ AI action plan</button>
        </div>
      </div>

      <div className="grid4">
        <div className="metricCard"><div className="metricLabel">Assurance readiness</div><div className="metricValue">{data.assurance.assuranceReadinessPercent}%</div><div className="metricFoot">approved evidence only</div></div>
        <div className="metricCard"><div className="metricLabel">Approved evidence</div><div className="metricValue">{data.assurance.approvedEvidenceCount}</div><div className="metricFoot">{data.assurance.pendingEvidenceCount} pending review</div></div>
        <div className="metricCard"><div className="metricLabel">Open tasks</div><div className="metricValue">{data.assurance.openTaskCount}</div><div className="metricFoot">{data.assurance.criticalTaskCount} critical</div></div>
        <div className="metricCard"><div className="metricLabel">Certification</div><div className="metricValue">NOT CERTIFIED</div><div className="metricFoot">Live effect: NONE</div></div>
      </div>

      <div className="error">
        Evidence approval is an internal assurance control, not legal certification. This module cannot change payroll, leave balances,
        recruiting decisions, termination decisions, employee rights or government filings.
      </div>
    </section>

    <section className="card tableWrap">
      <div className="rowBetween">
        <div>
          <h3 className="sectionTitle">Compliance task board</h3>
          <p className="muted">Task completion is evidence-gated. Users cannot manually mark a task complete.</p>
        </div>
        <span className="badge">As of {data.asOfDate}</span>
      </div>
      {tasks.length === 0 ? <div className="notice">No governed tasks yet. Use “Create / refresh remediation tasks”.</div> : <table>
        <thead><tr><th>Priority</th><th>Obligation</th><th>Status</th><th>Owner</th><th>Due</th><th>Action</th></tr></thead>
        <tbody>{tasks.map((task) => <tr key={task.id}>
          <td><span className="badge">{task.priority}</span></td>
          <td><strong>{task.label}</strong><div className="muted">{task.nextAction}</div></td>
          <td>{task.status.replaceAll('_', ' ')}</td>
          <td>{task.owner}</td>
          <td>{task.dueDate || '—'}</td>
          <td>{data.canManage && task.status !== 'complete' && task.status !== 'closed_not_applicable'
            ? <div className="row">
                <button className="button secondary compact" disabled={busy} onClick={() => updateTask(task.id, 'in_progress')}>Start</button>
                <button className="button secondary compact" disabled={busy} onClick={() => updateTask(task.id, 'blocked')}>Block</button>
                <button className="button secondary compact" disabled={busy} onClick={() => updateTask(task.id, 'open')}>Reopen</button>
              </div>
            : <span className="muted">{task.completionReason?.replaceAll('_', ' ') || '—'}</span>}
          </td>
        </tr>)}</tbody>
      </table>}
    </section>

    <section className="card">
      <h3 className="sectionTitle">Submit governed evidence</h3>
      <div className="formGrid">
        <label><span>Obligation</span><select className="input" value={obligationId} onChange={(e) => setObligationId(e.target.value)}>
          <option value="">Select obligation…</option>
          {actionable.map((item: OntarioReadinessObligation) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select></label>
        <label><span>Evidence title</span><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 2026 Disconnecting-from-Work Policy" /></label>
        <label><span>Governed evidence reference</span><input className="input" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Document ID, controlled URL or repository reference" /></label>
        <label><span>Review / refresh due date</span><input className="input" type="date" value={reviewDueDate} onChange={(e) => setReviewDueDate(e.target.value)} /></label>
      </div>
      {data.canManage && <button className="button" disabled={busy} onClick={submitEvidence}>Submit evidence for review</button>}
    </section>

    <section className="card tableWrap">
      <div className="rowBetween">
        <div>
          <h3 className="sectionTitle">Evidence review inbox</h3>
          <p className="muted">Submitted evidence does not increase assurance readiness until an authorized human approves it.</p>
        </div>
        <label style={{ minWidth: 300 }}><span>Reviewer note</span><input className="input" value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Optional review note" /></label>
      </div>
      {data.evidence.length === 0 ? <div className="notice">No evidence has been submitted.</div> : <table>
        <thead><tr><th>Evidence</th><th>Obligation</th><th>Status</th><th>Review due</th><th>Reviewer</th><th>Action</th></tr></thead>
        <tbody>{data.evidence.map((item) => <tr key={item.id}>
          <td><strong>{item.title}</strong><div className="muted">{item.reference}</div></td>
          <td>{data.assessment.obligations.find((obligation) => obligation.id === item.obligationId)?.label || item.obligationId}</td>
          <td><span className="badge">{item.operationalStatus.replaceAll('_', ' ')}</span></td>
          <td>{item.reviewDueDate || '—'}</td>
          <td>{item.reviewerUid || '—'}{item.reviewNote && <div className="muted">{item.reviewNote}</div>}</td>
          <td>{data.canManage && item.operationalStatus === 'submitted'
            ? <div className="row">
                <button className="button compact" disabled={busy} onClick={() => reviewEvidence(item.id, 'approved')}>Approve</button>
                <button className="button secondary compact" disabled={busy} onClick={() => reviewEvidence(item.id, 'rejected')}>Reject</button>
              </div>
            : <span className="muted">Human-reviewed</span>}
          </td>
        </tr>)}</tbody>
      </table>}
    </section>

    <section className="card">
      <h3 className="sectionTitle">Assurance safeguards</h3>
      <ul>{data.assurance.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
    </section>
  </div>;
}