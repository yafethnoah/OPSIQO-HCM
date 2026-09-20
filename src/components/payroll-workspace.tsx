'use client';

import { useEffect, useMemo, useState } from 'react';
import { activeOrgId, apiFetch } from '@/lib/http/client';
import type { PayrollDashboard, PayrollRun } from '@/domain/payroll';
import { LoadingState } from '@/components/data-states';
import { PayrollOperationsCommandCenter } from '@/components/payroll-operations-command-center';
import { PaycheckLedger } from '@/components/paycheck-ledger';

const localDate = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const cad = (n?: number, c = 'CAD') =>
  typeof n === 'number'
    ? new Intl.NumberFormat('en-CA', { style: 'currency', currency: c, maximumFractionDigits: 2 }).format(n)
    : '—';

const askAi = (prompt: string) =>
  window.dispatchEvent(new CustomEvent('opsiqo:ai-assist', { detail: { prompt } }));

export function PayrollWorkspace() {
  const [d, setD] = useState<PayrollDashboard | null>(null);
  const [readiness, setReadiness] = useState<any>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');
  const [name, setName] = useState('Regular payroll');
  const [payDate, setPayDate] = useState(localDate());
  const [periodStart, setPeriodStart] = useState(localDate());
  const [periodEnd, setPeriodEnd] = useState(localDate());
  const [workerPayDates, setWorkerPayDates] = useState<Record<string, string>>({});
  const [selectedWorkers, setSelectedWorkers] = useState<Record<string, boolean>>({});

  const load = async () => {
    try {
      setErr('');
      const [dashboard, ready] = await Promise.all([
        apiFetch<{ data: PayrollDashboard }>(`/api/organizations/${activeOrgId()}/payroll/dashboard`),
        apiFetch<{ data: any }>(`/api/organizations/${activeOrgId()}/payroll/readiness`),
      ]);

      setD(dashboard.data);
      setReadiness(ready.data);

      setSelectedWorkers((current) => {
        const next = { ...current };
        for (const worker of ready.data.workers || []) {
          if (!(worker.workerId in next)) next[worker.workerId] = true;
        }
        return next;
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Unable to load payroll.');
    }
  };

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener('opsiqo:payroll-calendar-updated', refresh);
    return () => window.removeEventListener('opsiqo:payroll-calendar-updated', refresh);
  }, []);

  const providers = useMemo(
    () => d?.providers.filter((p) => (p.environment || 'uat') === 'uat') || [],
    [d],
  );

  if (!d) return <LoadingState label="Loading governed payroll…" />;

  const selectedWorkerIds = (readiness?.workers || [])
    .filter((w: any) => selectedWorkers[w.workerId] !== false)
    .map((w: any) => w.workerId);

  const selectedNotReady = (readiness?.workers || []).filter(
    (w: any) => selectedWorkers[w.workerId] !== false && !w.ready,
  );

  const blocked = selectedWorkerIds.length === 0 || selectedNotReady.length > 0;

  function guide(steps: number[]) {
    window.dispatchEvent(new CustomEvent('opsiqo:guide-progress', { detail: { steps } }));
  }

  async function createRun() {
    setBusy('create');
    setErr('');
    setMsg('');

    try {
      const exactOverrides = Object.fromEntries(
        Object.entries(workerPayDates).filter(
          ([workerId, date]) => selectedWorkerIds.includes(workerId) && Boolean(date),
        ),
      );

      await apiFetch(`/api/organizations/${activeOrgId()}/payroll/runs`, {
        method: 'POST',
        body: JSON.stringify({
          name,
          payDate,
          periodStart,
          periodEnd,
          kind: 'regular',
          mode: 'uat',
          providerId: providers[0]?.id,
          workerIds: selectedWorkerIds,
          workerPayDates: exactOverrides,
          idempotencyKey: globalThis.crypto?.randomUUID?.() || `${Date.now()}-uat`,
        }),
      });

      guide([0, 1]);
      setMsg('Controlled UAT payroll run created with reviewed worker-specific exact run overrides and governed calendar rules.');
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Unable to create payroll run.');
    } finally {
      setBusy('');
    }
  }

  async function act(run: PayrollRun, action: string) {
    setBusy(`${run.id}:${action}`);
    setErr('');
    setMsg('');

    try {
      await apiFetch(`/api/organizations/${activeOrgId()}/payroll/runs/${run.id}`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          providerId: run.providerId || providers[0]?.id,
          note: action === 'reverse' ? 'UAT reversal test' : '',
        }),
      });

      guide(['approve', 'export', 'reconcile', 'complete'].includes(action) ? [0, 1, 2] : [0, 1]);
      setMsg(`Payroll ${action} step completed.`);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : `Unable to ${action} payroll.`);
    } finally {
      setBusy('');
    }
  }

  const next = (r: PayrollRun) =>
    r.status === 'draft'
      ? 'calculate'
      : r.status === 'calculated'
        ? 'review'
        : r.status === 'review'
          ? 'approve'
          : r.status === 'approved'
            ? 'export'
            : r.status === 'exported'
              ? 'reconcile'
              : r.status === 'reconciled'
                ? 'complete'
                : '';

  return (
    <div className="stack">
      {err && <div className="error">{err}</div>}
      {msg && <div className="success">{msg}</div>}

      <PayrollOperationsCommandCenter />

      <PaycheckLedger />

<section id="payroll-readiness" className="card stack">
  <div className="rowBetween">
    <div>
      <h2 className="sectionTitle">Run worker selection & exact release overrides</h2>
      <p className="muted">
        Persistent worker / pay-group / org-unit / organization release rules are managed only in Calendars.
        This table is run-specific: select workers and enter an exact override only when this payroll run needs one.
        If the exact date is blank, the backend resolves the authoritative calendar hierarchy, then legacy profile fallback, then the run default.
      </p>
    </div>
    <div className="compPayActionRow">
      <button
        className="button secondary compact"
        onClick={() =>
          askAi(
            'Prepare a payroll readiness plan for the selected workers. Explain compensation, profile, calendar, exact override and synchronization blockers. Do not run payroll or change employee pay.',
          )
        }
      >
        ✦ AI readiness plan
      </button>
      <button
        className="button secondary compact"
        onClick={() => {
          window.dispatchEvent(new CustomEvent('opsiqo:payroll-open-calendars'));
          document.querySelector('.payCompUx')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      >
        Manage persistent rules in Calendars
      </button>
    </div>
  </div>

  <div className="compPayWideTable">
    <table>
      <thead>
        <tr>
          <th>Include</th>
          <th>Employee</th>
          <th>Hourly</th>
          <th>Monthly</th>
          <th>Annual</th>
          <th>Readiness</th>
          <th>Exact date this run</th>
          <th>Fallback authority</th>
        </tr>
      </thead>
      <tbody>
        {(readiness?.workers || []).map((w: any) => {
          const exact = workerPayDates[w.workerId] || '';
          return (
            <tr key={w.workerId}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedWorkers[w.workerId] !== false}
                  onChange={(e) =>
                    setSelectedWorkers((current) => ({
                      ...current,
                      [w.workerId]: e.target.checked,
                    }))
                  }
                  aria-label={`Include ${w.displayName} in this payroll run`}
                />
              </td>
              <td><strong>{w.displayName}</strong><div className="muted">#{w.employeeNumber}</div></td>
              <td>{cad(w.hourlyRate,w.currency)}</td>
              <td>{cad(w.monthlyPay,w.currency)}</td>
              <td>{cad(w.annualPay,w.currency)}</td>
              <td>{w.ready ? <span className="badge">Ready</span> : w.issues.join('; ')}</td>
              <td>
                <input
                  className="input"
                  type="date"
                  value={exact}
                  onChange={(e) =>
                    setWorkerPayDates((current) => ({
                      ...current,
                      [w.workerId]: e.target.value,
                    }))
                  }
                />
                <div className="muted">Blank = authoritative hierarchy</div>
              </td>
              <td>
                <strong>{exact ? 'Exact run override' : 'Calendar hierarchy'}</strong>
                <div className="muted">{exact ? exact : 'Worker → pay group → org unit → organization → profile fallback → run default'}</div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
</section>

<section id="payroll-controlled-regular-run" className="card stack">
  <h2 className="sectionTitle">Controlled UAT payroll run</h2>
        <p className="muted">
          Uses real OPSIQO compensation, approved time, payroll profiles, approved adjustments and the resolved
          release date for each selected worker. Production approval remains blocked until the statutory reference
          pack and production provider are independently certified.
        </p>

        <div className="grid4">
          <label>
            Run name
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Period start
            <input className="input" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          </label>
          <label>
            Period end
            <input className="input" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </label>
          <label>
            Default release date
            <input className="input" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
          </label>
        </div>

        <div className="notice">
          Selected workers: <strong>{selectedWorkerIds.length}</strong>. Worker-specific exact run overrides and governed calendar rules are resolved
          inside the run and are carried into statutory calculation input, provider export, pay statements
          and YTD ordering.
        </div>

        <button className="button" disabled={Boolean(busy) || !providers.length || blocked} onClick={createRun}>
          {busy === 'create' ? 'Creating…' : 'Create UAT payroll run'}
        </button>

        {!providers.length && (
          <div className="notice">Configure an evidence-sandbox UAT payroll provider before creating a run.</div>
        )}

        {selectedWorkerIds.length === 0 && (
          <div className="notice">Select at least one worker before creating the payroll run.</div>
        )}

        {selectedNotReady.length > 0 && (
          <div className="notice">
            Payroll run is blocked because {selectedNotReady.length} selected worker
            {selectedNotReady.length === 1 ? ' is' : 's are'} not ready. Resolve their cockpit blockers or unselect
            them to create an explicitly reviewed worker subset.
          </div>
        )}
      </section>

      <section className="card tableWrap compPayWideTable">
        <h2 className="sectionTitle">Payroll runs</h2>
        <table>
          <thead>
            <tr>
              <th>Run</th>
              <th>Period</th>
              <th>Default release</th>
              <th>Resolved release dates</th>
              <th>Mode</th>
              <th>Status</th>
              <th>Workers</th>
              <th>Gross</th>
              <th>Net</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {d.payrollRuns
              .slice()
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((r) => {
                const action = next(r);
                const resolved = Object.values(r.resolvedWorkerPayDates || r.workerPayDates || {});
                const dates = Array.from(new Set([r.payDate, ...resolved])).sort();

                return (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>
                      {r.periodStart} → {r.periodEnd}
                    </td>
                    <td>{r.payDate}</td>
                    <td>{dates.join(', ')}</td>
                    <td>{r.mode || 'uat'}</td>
                    <td>{r.status}</td>
                    <td>{r.totals?.workers || '—'}</td>
                    <td>{r.totals?.gross !== undefined ? cad(r.totals.gross) : '—'}</td>
                    <td>{r.totals?.net !== undefined ? cad(r.totals.net) : '—'}</td>
                    <td>
                      {action ? (
                        <button
                          className="button secondary"
                          disabled={Boolean(busy)}
                          onClick={() => act(r, action)}
                        >
                          {busy === `${r.id}:${action}` ? 'Working…' : action}
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </section>

      <section id="payroll-providers" className="card tableWrap compPayWideTable">
        <h2 className="sectionTitle">Payroll providers</h2>
        <table>
          <thead>
            <tr>
              <th>Provider</th>
              <th>Adapter</th>
              <th>Environment</th>
              <th>Status</th>
              <th>Mapping</th>
            </tr>
          </thead>
          <tbody>
            {d.providers.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.adapterCode}</td>
                <td>{p.environment || 'uat'}</td>
                <td>{p.status}</td>
                <td>{p.mappingVersion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="notice">
        <strong>Regulatory gate:</strong> {d.regulatoryStatus.state} · {d.regulatoryStatus.ruleVersion}
        <br />
        {d.disclaimer}
      </div>
    </div>
  );
}
