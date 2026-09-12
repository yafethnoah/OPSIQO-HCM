'use client';

import { useEffect, useMemo, useState } from 'react';
import { activeOrgId, apiFetch } from '@/lib/http/client';
import type { PayrollDashboard, PayrollPayDateRule, PayrollRun, PayrollWeekendAdjustment } from '@/domain/payroll';
import { LoadingState } from '@/components/data-states';

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

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function previewReleaseDate(
  defaultDate: string,
  offset: number,
  weekendAdjustment: PayrollWeekendAdjustment,
) {
  let value = shiftDate(defaultDate, offset);
  if (weekendAdjustment === 'none') return value;

  const day = new Date(`${value}T12:00:00Z`).getUTCDay();
  if (weekendAdjustment === 'previous_weekday') {
    if (day === 6) value = shiftDate(value, -1);
    if (day === 0) value = shiftDate(value, -2);
  } else {
    if (day === 6) value = shiftDate(value, 2);
    if (day === 0) value = shiftDate(value, 1);
  }

  return value;
}

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
  const [releaseRuleTypes, setReleaseRuleTypes] = useState<Record<string, PayrollPayDateRule>>({});
  const [releaseOffsets, setReleaseOffsets] = useState<Record<string, number>>({});
  const [releaseDays, setReleaseDays] = useState<Record<string, number>>({});
  const [weekendRules, setWeekendRules] = useState<Record<string, PayrollWeekendAdjustment>>({});
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

      setReleaseRuleTypes((current) => {
        const next = { ...current };
        for (const worker of ready.data.workers || []) {
          if (!(worker.workerId in next)) {
            next[worker.workerId] = (worker.payDateRule || 'run_default') as PayrollPayDateRule;
          }
        }
        return next;
      });

      setReleaseOffsets((current) => {
        const next = { ...current };
        for (const worker of ready.data.workers || []) {
          if (!(worker.workerId in next)) next[worker.workerId] = Number(worker.payDateOffsetDays || 0);
        }
        return next;
      });

      setReleaseDays((current) => {
        const next = { ...current };
        for (const worker of ready.data.workers || []) {
          if (!(worker.workerId in next)) next[worker.workerId] = Number(worker.payDayOfMonth || 15);
        }
        return next;
      });

      setWeekendRules((current) => {
        const next = { ...current };
        for (const worker of ready.data.workers || []) {
          if (!(worker.workerId in next)) {
            next[worker.workerId] = (worker.weekendAdjustment || 'none') as PayrollWeekendAdjustment;
          }
        }
        return next;
      });

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

  async function prepareDrafts() {
    setBusy('drafts');
    setErr('');
    setMsg('');
    try {
      await apiFetch(`/api/organizations/${activeOrgId()}/payroll/readiness`, {
        method: 'POST',
        body: JSON.stringify({ action: 'prepare_drafts' }),
      });
      guide([0, 1]);
      setMsg('Payroll-profile drafts prepared for human review.');
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Unable to prepare payroll drafts.');
    } finally {
      setBusy('');
    }
  }

  async function saveReleaseRule(workerId: string) {
    const profile = d?.workerProfiles.find((p) => p.workerId === workerId);
    if (!profile) {
      setErr('Create and review the payroll profile before saving a member-specific release-date rule.');
      return;
    }

    setBusy(`profile:${workerId}`);
    setErr('');
    setMsg('');

    try {
      await apiFetch(`/api/organizations/${activeOrgId()}/payroll/profiles/${workerId}`, {
        method: 'PUT',
        body: JSON.stringify({
          province: profile.province,
          payPeriodsPerYear: profile.payPeriodsPerYear,
          federalClaimAmount: profile.federalClaimAmount,
          provincialClaimAmount: profile.provincialClaimAmount,
          additionalTax: profile.additionalTax,
          recurringTaxableBenefits: profile.recurringTaxableBenefits,
          recurringPreTaxDeductions: profile.recurringPreTaxDeductions,
          recurringOtherDeductions: profile.recurringOtherDeductions,
          paymentMethodRef: profile.paymentMethodRef,
          enabled: profile.enabled,
          payDateRule: releaseRuleTypes[workerId] || 'run_default',
          payDateOffsetDays: Number(releaseOffsets[workerId] || 0),
          payDayOfMonth:
            (releaseRuleTypes[workerId] || 'run_default') === 'fixed_day_of_month'
              ? Number(releaseDays[workerId] || 1)
              : undefined,
          weekendAdjustment: weekendRules[workerId] || 'none',
        }),
      });

      guide([0, 1]);
      setMsg('Member-specific payroll release-date rule saved.');
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Unable to save member release-date rule.');
    } finally {
      setBusy('');
    }
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
      setMsg('Controlled UAT payroll run created with reviewed member release dates.');
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

      <section className="card stack">
        <div className="rowBetween">
          <div>
            <h2 className="sectionTitle">Payroll readiness cockpit</h2>
            <p className="muted">
              Compensation and payroll use the same normalized pay authority. Compensation effective date,
              payroll period and pay release date are separate controls. Each member may use the run default,
              a persistent offset rule, or an exact run-level release-date override.
            </p>
          </div>
          <button
            className="button secondary compact"
            onClick={() =>
              askAi(
                'Prepare a payroll readiness plan from the current OPSIQO blockers. Explain missing profiles, compensation, approved time, provider prerequisites and member-specific release-date rules. Do not run payroll or change employee pay.',
              )
            }
          >
            ✦ AI readiness plan
          </button>
        </div>

        {readiness && (
          <>
            <div className="grid4">
              <div className="metricCard">
                <div className="metricLabel">Workers in scope</div>
                <div className="metricValue">{readiness.totalWorkers}</div>
              </div>
              <div className="metricCard">
                <div className="metricLabel">Ready</div>
                <div className="metricValue">{readiness.readyWorkers}</div>
              </div>
              <div className="metricCard">
                <div className="metricLabel">Missing compensation</div>
                <div className="metricValue">{readiness.missingCompensation}</div>
              </div>
              <div className="metricCard">
                <div className="metricLabel">Comp → Payroll review</div>
                <div className="metricValue">{readiness.syncPending || 0}</div>
                <div className="metricFoot">pending profile review</div>
              </div>
            </div>

            {readiness.missingProfiles > 0 && (
              <div className="notice">
                <strong>{readiness.missingProfiles} workers do not have an active payroll profile.</strong>{' '}
                Draft preparation copies pay evidence only; it does not guess province, tax claims, pay periods,
                release-date rules or banking/payment details.
                <br />
                <button className="button compact" disabled={Boolean(busy)} onClick={prepareDrafts}>
                  {busy === 'drafts' ? 'Preparing…' : 'Prepare missing drafts'}
                </button>
              </div>
            )}

            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Hourly</th>
                    <th>Monthly</th>
                    <th>Annual</th>
                    <th>Release rule</th>
                    <th>Comp → Payroll</th>
                    <th>Readiness</th>
                  </tr>
                </thead>
                <tbody>
                  {readiness.workers.map((w: any) => (
                    <tr key={w.workerId}>
                      <td>
                        <strong>{w.displayName}</strong>
                        <div className="muted">#{w.employeeNumber}</div>
                      </td>
                      <td>{cad(w.hourlyRate, w.currency)}</td>
                      <td>{cad(w.monthlyPay, w.currency)}</td>
                      <td>{cad(w.annualPay, w.currency)}</td>
                      <td>{w.releaseRule || 'Uses run default release date'}</td>
                      <td>
                        {w.syncStatus ? (
                          <>
                            <span className="badge">{String(w.syncStatus).replaceAll('_', ' ')}</span>
                            {w.syncUpdatedAt && (
                              <div className="muted">{String(w.syncUpdatedAt).slice(0, 16).replace('T', ' ')}</div>
                            )}
                          </>
                        ) : (
                          <span className="muted">No compensation sync event yet</span>
                        )}
                      </td>
                      <td>{w.ready ? <span className="badge">Ready</span> : w.issues.join('; ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="card stack">
        <div className="rowBetween">
          <div>
            <h2 className="sectionTitle">Member-specific salary release dates</h2>
            <p className="muted">
              The run has one default release date, but every selected member can use the default, a persistent
              day offset, a fixed day of month, and/or an exact date for this run. Exact run override wins. The
              reviewed profile rule applies next. Otherwise OPSIQO uses the run default.
            </p>
          </div>
          <span className="badge">Human reviewed</span>
        </div>

        <div className="notice">
          Weekend adjustment means Saturday/Sunday only. Public-holiday changes should be entered as an exact
          run-level date unless a governed holiday calendar is configured in a future release.
        </div>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Include</th>
                <th>Employee</th>
                <th>Persistent rule</th>
                <th>Rule value</th>
                <th>Weekend rule</th>
                <th>Exact date this run</th>
                <th>Resolved preview</th>
                <th>Profile action</th>
              </tr>
            </thead>
            <tbody>
              {(readiness?.workers || []).map((w: any) => {
                const rule = (releaseRuleTypes[w.workerId] ||
                  w.payDateRule ||
                  'run_default') as PayrollPayDateRule;
                const offset = Number(releaseOffsets[w.workerId] ?? w.payDateOffsetDays ?? 0);
                const fixedDay = Number(releaseDays[w.workerId] ?? w.payDayOfMonth ?? 15);
                const weekend = (weekendRules[w.workerId] ||
                  w.weekendAdjustment ||
                  'none') as PayrollWeekendAdjustment;
                const exact = workerPayDates[w.workerId] || '';

                let profilePreview = payDate;
                if (rule === 'offset_days') profilePreview = previewReleaseDate(payDate, offset, 'none');
                if (rule === 'fixed_day_of_month') {
                  const d = new Date(`${payDate}T12:00:00Z`);
                  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 12)).getUTCDate();
                  const day = Math.min(Math.max(Math.trunc(fixedDay), 1), lastDay);
                  profilePreview = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                }
                profilePreview = previewReleaseDate(profilePreview, 0, weekend);
                const preview = exact || profilePreview;
                const profileExists = d.workerProfiles.some((p) => p.workerId === w.workerId);

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
                    <td>
                      <strong>{w.displayName}</strong>
                      <div className="muted">{w.ready ? 'Ready' : w.issues.join('; ')}</div>
                    </td>
                    <td>
                      <select
                        className="input"
                        value={rule}
                        onChange={(e) =>
                          setReleaseRuleTypes((current) => ({
                            ...current,
                            [w.workerId]: e.target.value as PayrollPayDateRule,
                          }))
                        }
                      >
                        <option value="run_default">Run default</option>
                        <option value="offset_days">Days from default</option>
                        <option value="fixed_day_of_month">Fixed day of month</option>
                      </select>
                    </td>
                    <td>
                      {rule === 'offset_days' ? (
                        <label>
                          Days from default
                          <input
                            className="input"
                            type="number"
                            min={-31}
                            max={31}
                            value={offset}
                            onChange={(e) =>
                              setReleaseOffsets((current) => ({
                                ...current,
                                [w.workerId]: Number(e.target.value),
                              }))
                            }
                          />
                        </label>
                      ) : rule === 'fixed_day_of_month' ? (
                        <label>
                          Day of month
                          <input
                            className="input"
                            type="number"
                            min={1}
                            max={31}
                            value={fixedDay}
                            onChange={(e) =>
                              setReleaseDays((current) => ({
                                ...current,
                                [w.workerId]: Number(e.target.value),
                              }))
                            }
                          />
                        </label>
                      ) : (
                        <span className="muted">Uses default</span>
                      )}
                    </td>
                    <td>
                      <select
                        className="input"
                        value={weekend}
                        onChange={(e) =>
                          setWeekendRules((current) => ({
                            ...current,
                            [w.workerId]: e.target.value as PayrollWeekendAdjustment,
                          }))
                        }
                      >
                        <option value="none">No weekend adjustment</option>
                        <option value="previous_weekday">Previous weekday</option>
                        <option value="next_weekday">Next weekday</option>
                      </select>
                    </td>
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
                      <div className="muted">Blank = profile/default</div>
                    </td>
                    <td>
                      <strong>{preview}</strong>
                      <div className="muted">
                        {exact ? 'Exact worker override' : rule !== 'run_default' || weekend !== 'none' ? 'Profile rule' : 'Run default'}
                      </div>
                    </td>
                    <td>
                      <button
                        className="button secondary compact"
                        disabled={Boolean(busy) || !profileExists}
                        onClick={() => saveReleaseRule(w.workerId)}
                      >
                        {busy === `profile:${w.workerId}` ? 'Saving…' : 'Save release rule'}
                      </button>
                      {!profileExists && <div className="muted">Review payroll profile first</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid4">
        {d.metrics.map((m) => (
          <div className="card metricCard" key={m.key}>
            <div className="metricLabel">{m.label}</div>
            <div className="metricValue">{m.value}</div>
            <div className="metricFoot">{m.helper}</div>
          </div>
        ))}
      </div>

      <section className="card stack">
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
          Selected workers: <strong>{selectedWorkerIds.length}</strong>. Member-specific release dates are resolved
          separately inside the run and are carried into statutory calculation input, provider export, pay statements
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

      <section className="card tableWrap">
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

      <section className="card tableWrap">
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
