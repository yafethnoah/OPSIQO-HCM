'use client';

import { useEffect, useMemo, useState } from 'react';
import { activeOrgId, apiDownload, apiFetch } from '@/lib/http/client';
import type { ActorContext } from '@/domain/security';
import type { PayrollDashboard } from '@/domain/payroll';
import type {
  PaycheckDisplayStatus,
  PaycheckLedgerResponse,
  PaycheckLedgerRow,
} from '@/domain/paycheck';
import { LoadingState } from '@/components/data-states';

const localDate = () => {
  const value = new Date();
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const money = (value: number, currency = 'CAD') =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const label = (status: PaycheckDisplayStatus) =>
  status.replaceAll('_', ' ').replace(/\b\w/g, (x) => x.toUpperCase());

type PayrollReadinessWorker = {
  workerId: string;
  displayName: string;
  employeeNumber?: string;
  ready: boolean;
  issues: string[];
};

type PayrollReadinessSnapshot = {
  totalWorkers: number;
  readyWorkers: number;
  workers: PayrollReadinessWorker[];
};

function blockerHref(issue: string, workerId: string) {
  const value = issue.toLowerCase();

  if (value.includes('compensation') || value.includes('sync review')) {
    return '/compensation';
  }

  if (value.includes('open shift')) {
    return '/time';
  }

  if (
    value.includes('payroll profile') ||
    value.includes('pay frequency') ||
    value.includes('release-date') ||
    value.includes('fixed salary release')
  ) {
    return `/people/${encodeURIComponent(workerId)}`;
  }

  return '/payroll#payroll-readiness';
}

export function PaycheckLedger() {
  const [data, setData] = useState<PaycheckLedgerResponse | null>(null);
  const [actor, setActor] = useState<ActorContext | null>(null);
  const [readiness, setReadiness] = useState<PayrollReadinessSnapshot | null>(null);
  const [uatProviderCount, setUatProviderCount] = useState(0);
  const [status, setStatus] = useState<'all' | PaycheckDisplayStatus>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [editing, setEditing] = useState<string>('');
  const [paidDate, setPaidDate] = useState(localDate());
  const [paymentReference, setPaymentReference] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const query = useMemo(() => {
    const params = new URLSearchParams({
      status,
      asOf: localDate(),
    });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return params.toString();
  }, [status, from, to]);

  const load = async () => {
    setError('');
    const orgId = activeOrgId();

    try {
      const [ledger, me, ready, dashboard] = await Promise.all([
        apiFetch<{ data: PaycheckLedgerResponse }>(
          `/api/organizations/${orgId}/payroll/paychecks?${query}`,
        ),
        apiFetch<{ actor: ActorContext }>('/api/me'),
        apiFetch<{ data: PayrollReadinessSnapshot }>(
          `/api/organizations/${orgId}/payroll/readiness`,
        ),
        apiFetch<{ data: PayrollDashboard }>(
          `/api/organizations/${orgId}/payroll/dashboard`,
        ),
      ]);

      setData(ledger.data);
      setActor(me.actor);
      setReadiness(ready.data);
      setUatProviderCount(
        (dashboard.data.providers || []).filter(
          (provider) => (provider.environment || 'uat') === 'uat',
        ).length,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load paycheck ledger.');
    }
  };

  useEffect(() => {
    void load();
  }, [query]);

  async function markPaid(row: PaycheckLedgerRow) {
    setBusy(row.id);
    setError('');
    setMessage('');

    try {
      await apiFetch(
        `/api/organizations/${activeOrgId()}/payroll/paychecks/${encodeURIComponent(row.id)}/paid`,
        {
          method: 'POST',
          body: JSON.stringify({
            paidDate,
            paymentReference: paymentReference.trim() || undefined,
            note: note.trim() || undefined,
          }),
        },
      );

      setMessage(`${row.displayName}'s paycheck is saved as Paid.`);
      setEditing('');
      setPaymentReference('');
      setNote('');
      setPaidDate(localDate());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to mark paycheck paid.');
    } finally {
      setBusy('');
    }
  }

  async function downloadExcel() {
    setBusy('download');
    setError('');

    try {
      const result = await apiDownload(
        `/api/organizations/${activeOrgId()}/payroll/paychecks/export?${query}`,
      );

      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = result.fileName || `OPSIQO_Paychecks_${localDate()}.xls`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to download paycheck Excel file.');
    } finally {
      setBusy('');
    }
  }

  if (!data || !actor || !readiness) {
    return (
      <section className="card stack">
        {error && <div className="error">{error}</div>}
        <LoadingState label="Loading paycheck due and payment ledger..." />
      </section>
    );
  }

  const canMarkPaid = actor.permissions.includes('payroll.reconcile');
  const canExport = actor.permissions.includes('payroll.export');

  return (
    <section className="card stack">
      <div className="rowBetween">
        <div>
          <h2 className="sectionTitle">Paycheck due & payment ledger</h2>
          <p className="muted">
            Due dates come from OPSIQO payroll release-date authority. Marking a
            paycheck Paid creates a persistent audited payment record; it does not
            rewrite the authoritative payroll due date.
          </p>
        </div>
        {canExport && (
          <button
            className="button secondary"
            disabled={Boolean(busy)}
            onClick={() => void downloadExcel()}
          >
            {busy === 'download' ? 'Preparing Excel...' : 'Download Paycheck Excel'}
          </button>
        )}
      </div>

      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      <div className="grid4">
        <div className="metricCard">
          <div className="metricLabel">Due today</div>
          <div className="metricValue">{data.summary.dueToday}</div>
          <div className="metricFoot">As of {data.asOf}</div>
        </div>
        <div className="metricCard">
          <div className="metricLabel">Overdue</div>
          <div className="metricValue">{data.summary.overdue}</div>
          <div className="metricFoot">Unpaid past due date</div>
        </div>
        <div className="metricCard">
          <div className="metricLabel">Paid</div>
          <div className="metricValue">{data.summary.paid}</div>
          <div className="metricFoot">{money(data.summary.totalPaidAmount)}</div>
        </div>
        <div className="metricCard">
          <div className="metricLabel">Outstanding</div>
          <div className="metricValue">{money(data.summary.totalDueAmount)}</div>
          <div className="metricFoot">{data.summary.total - data.summary.paid} paycheck(s)</div>
        </div>
      </div>

      <div className="grid3">
        <label>
          Payment status
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            <option value="all">All</option>
            <option value="upcoming">Upcoming</option>
            <option value="due_today">Due today</option>
            <option value="overdue">Overdue</option>
            <option value="paid">Paid</option>
          </select>
        </label>
        <label>
          Due from
          <input
            className="input"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          Due to
          <input
            className="input"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>

      <div className="tableWrap compPayWideTable">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Position / department</th>
              <th>Pay period</th>
              <th>Due date</th>
              <th>Status</th>
              <th>Gross</th>
              <th>Deductions</th>
              <th>Net paycheck</th>
              <th>Run</th>
              <th>Paid details</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.displayName}</strong>
                  <div className="muted">#{row.employeeNumber || 'No employee number'}</div>
                </td>
                <td>
                  {row.positionTitle || 'No current position'}
                  <div className="muted">{row.orgUnitName || 'No current org unit'}</div>
                </td>
                <td>{row.periodStart} to {row.periodEnd}</td>
                <td>
                  <strong>{row.dueDate}</strong>
                  <div className="muted">{row.payDateSource.replaceAll('_', ' ')}</div>
                </td>
                <td><span className="badge">{label(row.status)}</span></td>
                <td>{money(row.gross, row.currency)}</td>
                <td>{money(row.totalDeductions, row.currency)}</td>
                <td><strong>{money(row.net, row.currency)}</strong></td>
                <td>
                  {row.runName}
                  <div className="muted">{row.runStatus}</div>
                </td>
                <td>
                  {row.status === 'paid' ? (
                    <>
                      <strong>{row.paidDate}</strong>
                      <div className="muted">Ref: {row.paymentReference || 'Not recorded'}</div>
                      <div className="muted">By: {row.paidBy || 'Unknown'}</div>
                    </>
                  ) : (
                    <span className="muted">Not paid</span>
                  )}
                </td>
                <td>
                  {editing === row.id ? (
                    <div className="stack">
                      <label>
                        Paid date
                        <input
                          className="input"
                          type="date"
                          value={paidDate}
                          onChange={(e) => setPaidDate(e.target.value)}
                        />
                      </label>
                      <label>
                        Payment / cheque reference
                        <input
                          className="input"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                          placeholder="EFT, cheque or payment reference"
                        />
                      </label>
                      <label>
                        Notes
                        <input
                          className="input"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Optional finance note"
                        />
                      </label>
                      <div className="row">
                        <button
                          className="button compact"
                          disabled={busy === row.id || !paidDate}
                          onClick={() => void markPaid(row)}
                        >
                          {busy === row.id ? 'Saving...' : 'Confirm Paid'}
                        </button>
                        <button
                          className="button secondary compact"
                          disabled={Boolean(busy)}
                          onClick={() => setEditing('')}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : row.status === 'paid' ? (
                    <span className="badge">Saved as Paid</span>
                  ) : canMarkPaid && row.canMarkPaid ? (
                    <button
                      className="button compact"
                      disabled={Boolean(busy)}
                      onClick={() => {
                        setEditing(row.id);
                        setPaidDate(localDate());
                        setPaymentReference('');
                        setNote('');
                      }}
                    >
                      Mark as Paid
                    </button>
                  ) : (
                    <span className="muted">
                      {canMarkPaid ? 'Available after payroll export/reconciliation' : 'Read only'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {!data.rows.length && (
              <tr>
                <td colSpan={11}>
                  <PayrollReadinessEmptyState
                    readiness={readiness}
                    uatProviderCount={uatProviderCount}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="notice">
        Payment status is operational tracking evidence, not bank settlement
        confirmation. OPSIQO preserves the payroll calculation, due date, actor,
        timestamp and payment reference for audit review.
      </div>
    </section>
  );
}

function PayrollReadinessEmptyState({
  readiness,
  uatProviderCount,
}: {
  readiness: PayrollReadinessSnapshot;
  uatProviderCount: number;
}) {
  const blockedWorkers = readiness.workers.filter((worker) => !worker.ready);
  const allWorkersReady =
    readiness.totalWorkers > 0 &&
    readiness.readyWorkers === readiness.totalWorkers;
  const providerReady = uatProviderCount > 0;

  return (
    <div className="stack">
      <div className="notice">
        <strong>No calculated paychecks are available yet.</strong>
        <br />
        OPSIQO will populate this ledger only after a controlled payroll run
        has authoritative worker calculations. Resolve readiness first rather
        than creating manual paycheck records.
      </div>

      <div className="grid3">
        <div className="metricCard">
          <div className="metricLabel">Ready workers</div>
          <div className="metricValue">
            {readiness.readyWorkers}/{readiness.totalWorkers}
          </div>
          <div className="metricFoot">Payroll readiness evidence</div>
        </div>

        <div className="metricCard">
          <div className="metricLabel">Blocked workers</div>
          <div className="metricValue">{blockedWorkers.length}</div>
          <div className="metricFoot">Requires source data or review</div>
        </div>

        <div className="metricCard">
          <div className="metricLabel">UAT payroll provider</div>
          <div className="metricValue">{providerReady ? 'Ready' : 'Missing'}</div>
          <div className="metricFoot">
            {providerReady
              ? `${uatProviderCount} UAT provider${uatProviderCount === 1 ? '' : 's'} configured`
              : 'Configure an evidence-sandbox provider'}
          </div>
        </div>
      </div>

      {blockedWorkers.length > 0 && (
        <div className="stack">
          <strong>Exact payroll blockers</strong>

          {blockedWorkers.slice(0, 12).map((worker) => (
            <div className="notice" key={worker.workerId}>
              <strong>
                {worker.displayName}
                {worker.employeeNumber ? ` (#${worker.employeeNumber})` : ''}
              </strong>

              <ul>
                {worker.issues.map((issue) => (
                  <li key={issue}>
                    {issue}{' '}
                    <a href={blockerHref(issue, worker.workerId)}>Resolve</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="row">
        <a className="button" href="/payroll#payroll-readiness">
          Resolve payroll readiness
        </a>

        {!providerReady && (
          <a className="button secondary" href="/payroll#payroll-providers">
            Configure UAT payroll provider
          </a>
        )}

        {allWorkersReady && providerReady && (
          <a
            className="button secondary"
            href="/payroll#payroll-controlled-regular-run"
          >
            Create controlled payroll run
          </a>
        )}
      </div>

      <div className="muted">
        OPSIQO does not fabricate paycheck amounts, due dates, or Paid status.
        The ledger remains empty until the governed payroll workflow produces
        calculation evidence.
      </div>
    </div>
  );
}
