'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import type {
  AutopilotLevel,
  StrategicAgentActionPolicy,
  StrategicCountryPack,
  StrategicFivePhaseDashboard,
  StrategicMetricDefinition,
} from '@/domain/strategic-five-phase';
import { activeOrgId, apiFetch } from '@/lib/http/client';
import { LoadingState } from '@/components/data-states';
import {
  SCORE_METHODOLOGY,
  capabilityPresentation,
  countryPackCertification,
  displayPhaseName,
  type TowerTab,
} from '@/lib/strategic/five-phase-presentation';

type Me = { actor: { permissions: string[] } };
type AutomationPayload = { policy: { autopilotLevel: AutopilotLevel }; actions: StrategicAgentActionPolicy[] };

const sourceList = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);

export function FivePhaseControlTower() {
  const [dashboard, setDashboard] = useState<StrategicFivePhaseDashboard | null>(null);
  const [metrics, setMetrics] = useState<StrategicMetricDefinition[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [tab, setTab] = useState<TowerTab>('overview');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [d, m, metricRows] = await Promise.all([
        apiFetch<{ data: StrategicFivePhaseDashboard }>(`/api/organizations/${activeOrgId()}/strategic/five-phase`),
        apiFetch<Me>('/api/me'),
        apiFetch<{ data: StrategicMetricDefinition[] }>(`/api/organizations/${activeOrgId()}/strategic/metrics`),
      ]);
      setDashboard(d.data);
      setPermissions(m.actor.permissions);
      setMetrics(metricRows.data);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load the five-phase control tower.');
    }
  };

  useEffect(() => {
    void load();
    const handler = () => void load();
    window.addEventListener('opsiqo:organization-changed', handler);
    return () => window.removeEventListener('opsiqo:organization-changed', handler);
  }, []);

  const run = async (fn: () => Promise<unknown>) => {
    try {
      setBusy(true);
      setError('');
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Strategic action failed.');
    } finally {
      setBusy(false);
    }
  };

  if (!dashboard) {
    return <div className="stack">{error && <div className="error">{error}</div>}<LoadingState label="Loading five-phase transformation evidence…" /></div>;
  }

  const canManageStrategy = permissions.includes('strategy.manage');
  const canManageRegulatory = permissions.includes('regulatory.manage') || canManageStrategy;
  const canManageMetrics = permissions.includes('peopleanalytics.manage') || canManageStrategy;
  const canManageAi = permissions.includes('ai.manage');

  return <div className="stack">
    {error && <div className="error">{error}</div>}
    <section className="card">
      <div className="row between wrap">
        <div>
          <h2 className="sectionTitle">OPSIQO five-phase transformation control tower</h2>
          <p className="muted">Implementation governance for Foundation, GCC Platform Readiness, Workforce Intelligence, Agentic OPSIQO and Platform/Ecosystem execution. Scores are implementation coverage only.</p>
        </div>
        <div className="badge">Strategic blueprint implementation {dashboard.overallScore}%</div>
      </div>
      <div className="tabs">
        {(['overview', 'gcc', 'metrics', 'agents'] as const).map((item) =>
          <button key={item} className={`tab ${tab === item ? 'active' : ''}`} onClick={() => setTab(item)}>{item === 'gcc' ? 'GCC packs' : item}</button>
        )}
      </div>
    </section>

    {tab === 'overview' && <Overview dashboard={dashboard} onNavigate={setTab} />}
    {tab === 'gcc' && <GccPacks packs={dashboard.countryPacks} canManage={canManageRegulatory} busy={busy} run={run} />}
    {tab === 'metrics' && <Metrics metrics={metrics} canManage={canManageMetrics} busy={busy} run={run} />}
    {tab === 'agents' && <AgentControls dashboard={dashboard} canManage={canManageAi} busy={busy} run={run} />}
  </div>;
}

function Overview({
  dashboard,
  onNavigate,
}: {
  dashboard: StrategicFivePhaseDashboard;
  onNavigate: (tab: TowerTab) => void;
}) {
  const [phaseFilter, setPhaseFilter] = useState<'all' | string>('all');
  const [stateFilter, setStateFilter] = useState<'all' | 'implemented' | 'partial' | 'missing'>('all');
  const activeCountryPacks = dashboard.countryPacks.filter((pack) => pack.status === 'active').length;
  const filteredRows = dashboard.phases.flatMap((phase) =>
    phase.checklist
      .filter((item) => phaseFilter === 'all' || String(phase.id) === phaseFilter)
      .filter((item) => stateFilter === 'all' || item.state === stateFilter)
      .map((item) => ({ phase, item, presentation: capabilityPresentation(item.id) })),
  );

  return <div className="stack">
    <section className="metricGrid">
      <div className="card"><div className="muted">Implementation readiness</div><strong>Strategic blueprint</strong><div style={{ fontSize: 28, fontWeight: 800 }}>{dashboard.overallScore}%</div><div className="muted">Implementation coverage only</div></div>
      <div className="card"><div className="muted">Regulatory certification</div><strong>GCC country packs</strong><div style={{ fontSize: 28, fontWeight: 800 }}>{activeCountryPacks} / 2 active</div><div className="muted">Independent from blueprint score</div></div>
      <div className="card"><div className="muted">UAT certification</div><strong>Release-specific</strong><div style={{ fontSize: 20, fontWeight: 800 }}>Tracked separately</div><div className="muted">Not inferred from roadmap coverage</div></div>
      <div className="card"><div className="muted">Production certification</div><strong>Release-specific</strong><div style={{ fontSize: 20, fontWeight: 800 }}>Tracked separately</div><div className="muted">Not inferred from UAT or roadmap coverage</div></div>
    </section>

    <section className="metricGrid">
      {dashboard.phases.map((phase) =>
        <button
          type="button"
          className="card"
          style={{ textAlign: 'left', cursor: 'pointer' }}
          key={phase.id}
          onClick={() => setPhaseFilter(String(phase.id))}
          aria-label={`Filter capability matrix to Phase ${phase.id}`}
        >
          <div className="muted">Phase {phase.id}</div>
          <strong>{displayPhaseName(phase)}</strong>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{phase.score}%</div>
          <span className="badge">{phase.status.replaceAll('_', ' ')}</span>
        </button>
      )}
    </section>

    <section className="card">
      <h2 className="sectionTitle">Score methodology and certification boundary</h2>
      <p>{SCORE_METHODOLOGY}</p>
    </section>

    <section className="card tableWrap">
      <div className="row between wrap">
        <h2 className="sectionTitle">Capability closure matrix</h2>
        <div className="row wrap">
          <label><span>Phase</span><select value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)}>
            <option value="all">All phases</option>
            {dashboard.phases.map((phase) => <option key={phase.id} value={String(phase.id)}>Phase {phase.id} · {displayPhaseName(phase)}</option>)}
          </select></label>
          <label><span>State</span><select value={stateFilter} onChange={(e) => setStateFilter(e.target.value as typeof stateFilter)}>
            <option value="all">All states</option><option value="missing">Missing only</option><option value="partial">Partial only</option><option value="implemented">Implemented only</option>
          </select></label>
          {(phaseFilter !== 'all' || stateFilter !== 'all') && <button type="button" className="button compact" onClick={() => { setPhaseFilter('all'); setStateFilter('all'); }}>Clear filters</button>}
        </div>
      </div>
      <table>
        <thead><tr><th>Phase</th><th>Capability</th><th>State</th><th>Evidence / gap</th><th>Owner</th><th>Next action</th></tr></thead>
        <tbody>
          {filteredRows.map(({ phase, item, presentation }) =>
            <tr key={`${phase.id}-${item.id}`}>
              <td>{phase.id}</td>
              <td>{item.label}</td>
              <td><span className="badge">{item.state}</span></td>
              <td>{item.evidence || 'Implementation evidence still required.'}</td>
              <td>{presentation.owner}</td>
              <td>
                <div>{presentation.nextAction}</div>
                {presentation.targetTab && <button type="button" className="button compact" onClick={() => onNavigate(presentation.targetTab!)}>Take action</button>}
                {!presentation.targetTab && presentation.href && <a className="button compact" href={presentation.href}>Take action</a>}
              </td>
            </tr>
          )}
          {!filteredRows.length && <tr><td colSpan={6}>No capabilities match the selected filters.</td></tr>}
        </tbody>
      </table>
    </section>

    <div className="grid2">
      <section className="card">
        <h2 className="sectionTitle">Hard governance guardrails</h2>
        <ul>{dashboard.guardrails.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
      <section className="card">
        <h2 className="sectionTitle">Next highest-value closures</h2>
        <ol>{dashboard.nextPriorities.map((item) => <li key={item}>{item}</li>)}</ol>
      </section>
    </div>
  </div>;
}

function GccPacks({
  packs, canManage, busy, run,
}: {
  packs: StrategicCountryPack[];
  canManage: boolean;
  busy: boolean;
  run: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  return <div className="stack">
    <section className="card">
      <h2 className="sectionTitle">GCC country-pack release gate</h2>
      <p><strong>No fabricated Saudi/UAE law:</strong> country-pack configuration and platform-readiness scores are never regulatory certification. Activation requires official-source references, a versioned statutory rule-set, independent legal review, independent payroll validation, approved golden-test evidence, and Arabic/RTL QA evidence.</p>
      <p className="muted">Until a country pack is active with all release evidence recorded, OPSIQO displays NOT CERTIFIED.</p>
    </section>
    <div className="grid2">
      {packs.map((pack) => <CountryPackEditor key={pack.country} pack={pack} canManage={canManage} busy={busy} run={run} />)}
    </div>
  </div>;
}

function CountryPackEditor({
  pack, canManage, busy, run,
}: {
  pack: StrategicCountryPack;
  canManage: boolean;
  busy: boolean;
  run: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    version: pack.version,
    status: pack.status,
    officialSources: pack.officialSources.join(', '),
    statutoryRuleSetRef: pack.statutoryRuleSetRef || '',
    legalReviewRef: pack.legalReviewRef || '',
    payrollValidationRef: pack.payrollValidationRef || '',
    goldenTestEvidenceRef: pack.goldenTestEvidenceRef || '',
    arabicQaEvidenceRef: pack.arabicQaEvidenceRef || '',
    governmentConnectorEvidenceRef: pack.governmentConnectorEvidenceRef || '',
  });

  useEffect(() => {
    setDraft({
      version: pack.version,
      status: pack.status,
      officialSources: pack.officialSources.join(', '),
      statutoryRuleSetRef: pack.statutoryRuleSetRef || '',
      legalReviewRef: pack.legalReviewRef || '',
      payrollValidationRef: pack.payrollValidationRef || '',
      goldenTestEvidenceRef: pack.goldenTestEvidenceRef || '',
      arabicQaEvidenceRef: pack.arabicQaEvidenceRef || '',
      governmentConnectorEvidenceRef: pack.governmentConnectorEvidenceRef || '',
    });
  }, [pack]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    return run(() => apiFetch(`/api/organizations/${activeOrgId()}/strategic/country-packs/${pack.country}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...draft, officialSources: sourceList(draft.officialSources) }),
    }));
  };

  return <section className="card">
    <div className="row between wrap">
      <div><h2 className="sectionTitle">{pack.name}</h2><div className="muted">Pack lifecycle: {pack.status}</div></div>
      <div className="stack" style={{ alignItems: 'flex-end' }}>
        <span className="badge">{countryPackCertification(pack).label}</span>
        <span className="muted">Release evidence {countryPackCertification(pack).evidenceComplete}/{countryPackCertification(pack).evidenceRequired}</span>
      </div>
    </div>
    <p className="muted">{countryPackCertification(pack).detail}</p>
    <form className="formGrid" onSubmit={submit}>
      <Field label="Pack version" value={draft.version} set={(version) => setDraft({ ...draft, version })} disabled={!canManage} />
      <label><span>Status</span><select value={draft.status} disabled={!canManage} onChange={(e) => setDraft({ ...draft, status: e.target.value as StrategicCountryPack['status'] })}>
        {['draft', 'validation', 'approved', 'active', 'archived'].map((item) => <option key={item}>{item}</option>)}
      </select></label>
      <Field label="Official sources (comma separated)" value={draft.officialSources} set={(officialSources) => setDraft({ ...draft, officialSources })} disabled={!canManage} />
      <Field label="Statutory rule-set evidence ref" value={draft.statutoryRuleSetRef} set={(statutoryRuleSetRef) => setDraft({ ...draft, statutoryRuleSetRef })} disabled={!canManage} />
      <Field label="Independent legal review ref" value={draft.legalReviewRef} set={(legalReviewRef) => setDraft({ ...draft, legalReviewRef })} disabled={!canManage} />
      <Field label="Independent payroll validation ref" value={draft.payrollValidationRef} set={(payrollValidationRef) => setDraft({ ...draft, payrollValidationRef })} disabled={!canManage} />
      <Field label="Golden payroll test evidence ref" value={draft.goldenTestEvidenceRef} set={(goldenTestEvidenceRef) => setDraft({ ...draft, goldenTestEvidenceRef })} disabled={!canManage} />
      <Field label="Arabic / RTL QA evidence ref" value={draft.arabicQaEvidenceRef} set={(arabicQaEvidenceRef) => setDraft({ ...draft, arabicQaEvidenceRef })} disabled={!canManage} />
      <Field label="Government connector evidence ref" value={draft.governmentConnectorEvidenceRef} set={(governmentConnectorEvidenceRef) => setDraft({ ...draft, governmentConnectorEvidenceRef })} disabled={!canManage} />
      {canManage && <button className="button" disabled={busy}>Save governed country pack</button>}
    </form>
  </section>;
}

function Metrics({
  metrics, canManage, busy, run,
}: {
  metrics: StrategicMetricDefinition[];
  canManage: boolean;
  busy: boolean;
  run: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    code: 'KPI.',
    name: '',
    businessDefinition: '',
    formula: '',
    grain: 'organization-month',
    sourceEntities: 'worker, assignment',
    owner: 'People Analytics',
    freshnessSlaMinutes: 1440,
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    return run(async () => {
      await apiFetch(`/api/organizations/${activeOrgId()}/strategic/metrics`, {
        method: 'POST',
        body: JSON.stringify({ ...form, sourceEntities: sourceList(form.sourceEntities), status: 'draft' }),
      });
      setForm({ ...form, code: 'KPI.', name: '', businessDefinition: '', formula: '' });
    });
  };

  return <div className="stack">
    <section className="card tableWrap">
      <div className="row between wrap"><h2 className="sectionTitle">Governed semantic metric registry</h2><span className="badge">{metrics.length} definitions</span></div>
      <table><thead><tr><th>Metric</th><th>Definition / formula</th><th>Grain</th><th>Sources</th><th>Owner / SLA</th><th>Status</th></tr></thead>
        <tbody>{metrics.length ? metrics.map((metric) => <tr key={metric.id}>
          <td><strong>{metric.code}</strong><div>{metric.name}</div></td>
          <td><div>{metric.businessDefinition}</div><div className="muted">{metric.formula}</div></td>
          <td>{metric.grain}</td><td>{metric.sourceEntities.join(', ')}</td>
          <td>{metric.owner}<div className="muted">{metric.freshnessSlaMinutes} min</div></td><td><span className="badge">{metric.status}</span></td>
        </tr>) : <tr><td colSpan={6}>No governed metric definitions yet.</td></tr>}</tbody>
      </table>
    </section>
    {canManage && <section className="card">
      <h2 className="sectionTitle">Register metric definition</h2>
      <form className="formGrid" onSubmit={submit}>
        <Field label="Code" value={form.code} set={(code) => setForm({ ...form, code })} />
        <Field label="Name" value={form.name} set={(name) => setForm({ ...form, name })} />
        <Field label="Business definition" value={form.businessDefinition} set={(businessDefinition) => setForm({ ...form, businessDefinition })} />
        <Field label="Formula" value={form.formula} set={(formula) => setForm({ ...form, formula })} />
        <Field label="Grain" value={form.grain} set={(grain) => setForm({ ...form, grain })} />
        <Field label="Source entities" value={form.sourceEntities} set={(sourceEntities) => setForm({ ...form, sourceEntities })} />
        <Field label="Owner" value={form.owner} set={(owner) => setForm({ ...form, owner })} />
        <label><span>Freshness SLA (minutes)</span><input type="number" min={1} value={form.freshnessSlaMinutes} onChange={(e) => setForm({ ...form, freshnessSlaMinutes: Number(e.target.value) })} /></label>
        <button className="button" disabled={busy}>Create draft metric</button>
      </form>
    </section>}
  </div>;
}

function AgentControls({
  dashboard, canManage, busy, run,
}: {
  dashboard: StrategicFivePhaseDashboard;
  canManage: boolean;
  busy: boolean;
  run: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [level, setLevel] = useState<AutopilotLevel>(dashboard.automationPolicy.autopilotLevel);
  useEffect(() => setLevel(dashboard.automationPolicy.autopilotLevel), [dashboard.automationPolicy.autopilotLevel]);
  const grouped = useMemo(() => ['green', 'amber', 'red'].map((actionClass) => ({
    actionClass,
    actions: dashboard.actionPolicies.filter((item) => item.actionClass === actionClass),
  })), [dashboard.actionPolicies]);

  return <div className="stack">
    <section className="card">
      <h2 className="sectionTitle">Bounded Autopilot policy</h2>
      <p>Level 1 = informational, 2 = assisted, 3 = guided preparation, 4 = approved low-risk automation, 5 = bounded Green autonomy. Red actions remain assist-only at every level.</p>
      <div className="row wrap">
        <label><span>Tenant Autopilot level</span><select value={level} disabled={!canManage} onChange={(e) => setLevel(Number(e.target.value) as AutopilotLevel)}>
          {[1, 2, 3, 4, 5].map((item) => <option key={item} value={item}>Level {item}</option>)}
        </select></label>
        {canManage && <button className="button" disabled={busy || level === dashboard.automationPolicy.autopilotLevel} onClick={() => run(() => apiFetch(`/api/organizations/${activeOrgId()}/strategic/agent-controls`, { method: 'POST', body: JSON.stringify({ autopilotLevel: level }) }))}>Save Autopilot policy</button>}
      </div>
    </section>
    {grouped.map((group) => <section className="card tableWrap" key={group.actionClass}>
      <h2 className="sectionTitle">{group.actionClass.toUpperCase()} actions</h2>
      <table><thead><tr><th>Action</th><th>Minimum level</th><th>Human approval</th><th>Hard boundary</th></tr></thead>
        <tbody>{group.actions.map((item) => <tr key={item.key}><td>{item.label}<div className="muted">{item.key}</div></td><td>{item.minimumAutopilotLevel}</td><td>{item.humanApprovalRequired ? 'Required' : 'No'}</td><td>{item.hardBoundary}</td></tr>)}</tbody>
      </table>
    </section>)}
  </div>;
}

function Field({
  label, value, set, disabled = false,
}: {
  label: string;
  value: string;
  set: (value: string) => void;
  disabled?: boolean;
}) {
  return <label><span>{label}</span><input value={value} disabled={disabled} onChange={(e) => set(e.target.value)} /></label>;
}