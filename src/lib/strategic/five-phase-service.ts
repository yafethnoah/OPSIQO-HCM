import { randomUUID } from 'node:crypto';
import type { ActorContext, Permission } from '@/domain/security';
import type {
  AutopilotLevel,
  CountryPackStatus,
  StrategicAutomationPolicy,
  StrategicCountryPack,
  StrategicFivePhaseDashboard,
  StrategicMetricDefinition,
} from '@/domain/strategic-five-phase';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';
import {
  STRATEGIC_ACTION_POLICIES,
  baselineFivePhaseAssessment,
  countryPackActivationBlockers,
  defaultCountryPacks,
  metricDefinitionIssues,
  normalizeCountryCode,
  overallFivePhaseScore,
} from './five-phase-core';

const now = () => new Date().toISOString();
const allowedCountryStatuses: CountryPackStatus[] = ['draft', 'validation', 'approved', 'active', 'archived'];

const has = (actor: ActorContext, permission: string) =>
  actor.permissions.includes(permission as Permission);

function requireAny(actor: ActorContext, permissions: string[]) {
  if (!permissions.some((permission) => has(actor, permission))) {
    throw new ApiError(403, `One of these permissions is required: ${permissions.join(', ')}`, 'forbidden');
  }
}

export async function listStrategicCountryPacks(actor: ActorContext): Promise<StrategicCountryPack[]> {
  requireAny(actor, ['regulatory.read', 'strategy.read', 'payroll.read']);
  const snap = await adminDb().collection(`organizations/${actor.orgId}/strategicCountryPacks`).limit(10).get();
  const stored = new Map(snap.docs.map((doc) => [doc.id, doc.data() as StrategicCountryPack]));
  return defaultCountryPacks().map((fallback) => stored.get(fallback.country) || fallback);
}

export async function saveStrategicCountryPack(
  actor: ActorContext,
  raw: unknown,
  forcedCountry?: string,
): Promise<StrategicCountryPack> {
  requireAny(actor, ['regulatory.manage', 'strategy.manage']);
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const country = normalizeCountryCode(forcedCountry || input.country);
  if (!country) throw new ApiError(400, 'Country must be SA or AE.', 'invalid_country_pack');

  const defaults = defaultCountryPacks().find((item) => item.country === country)!;
  const ref = adminDb().doc(`organizations/${actor.orgId}/strategicCountryPacks/${country}`);
  const beforeSnap = await ref.get();
  const before = beforeSnap.exists ? (beforeSnap.data() as StrategicCountryPack) : undefined;
  const status = String(input.status || before?.status || 'draft') as CountryPackStatus;
  if (!allowedCountryStatuses.includes(status)) {
    throw new ApiError(400, 'Invalid country-pack status.', 'invalid_country_pack_status');
  }
  if ((status === 'approved' || status === 'active') && !has(actor, 'regulatory.approve')) {
    throw new ApiError(403, 'Regulatory approval permission is required to approve or activate a country pack.', 'forbidden');
  }

  const officialSources = Array.isArray(input.officialSources)
    ? input.officialSources.map(String).map((value) => value.trim()).filter(Boolean).slice(0, 25)
    : before?.officialSources || [];

  const row: StrategicCountryPack = {
    ...defaults,
    ...before,
    country,
    name: defaults.name,
    version: String(input.version || before?.version || defaults.version).trim() || defaults.version,
    status,
    officialSources,
    statutoryRuleSetRef: stringOrUndefined(input.statutoryRuleSetRef, before?.statutoryRuleSetRef),
    legalReviewRef: stringOrUndefined(input.legalReviewRef, before?.legalReviewRef),
    payrollValidationRef: stringOrUndefined(input.payrollValidationRef, before?.payrollValidationRef),
    goldenTestEvidenceRef: stringOrUndefined(input.goldenTestEvidenceRef, before?.goldenTestEvidenceRef),
    arabicQaEvidenceRef: stringOrUndefined(input.arabicQaEvidenceRef, before?.arabicQaEvidenceRef),
    governmentConnectorEvidenceRef: stringOrUndefined(input.governmentConnectorEvidenceRef, before?.governmentConnectorEvidenceRef),
    notes: stringOrUndefined(input.notes, before?.notes),
    createdBy: before?.createdBy || actor.uid,
    createdAt: before?.createdAt || now(),
    updatedBy: actor.uid,
    updatedAt: now(),
  };

  if (row.status === 'active') {
    const blockers = countryPackActivationBlockers(row);
    if (blockers.length) {
      throw new ApiError(
        409,
        'Country pack cannot be activated until all statutory, legal, payroll, golden-test and Arabic QA evidence gates pass.',
        'country_pack_not_release_ready',
        { blockers },
      );
    }
  }

  const audit = buildAudit(actor, {
    action: 'strategic.country_pack.update',
    entityType: 'strategicCountryPack',
    entityId: country,
    before,
    after: row,
    metadata: { activationBlockers: countryPackActivationBlockers(row) },
  });
  const batch = adminDb().batch();
  batch.set(ref, row, { merge: false });
  batch.create(adminDb().doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit);
  await batch.commit();
  return row;
}

export async function listStrategicMetrics(actor: ActorContext): Promise<StrategicMetricDefinition[]> {
  requireAny(actor, ['peopleanalytics.read', 'strategy.read']);
  const snap = await adminDb().collection(`organizations/${actor.orgId}/strategicMetricRegistry`).limit(200).get();
  return snap.docs
    .map((doc) => doc.data() as StrategicMetricDefinition)
    .sort((a, b) => a.code.localeCompare(b.code));
}

export async function saveStrategicMetric(
  actor: ActorContext,
  raw: unknown,
): Promise<StrategicMetricDefinition> {
  requireAny(actor, ['peopleanalytics.manage', 'strategy.manage']);
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const id = String(input.id || randomUUID()).trim();
  const ref = adminDb().doc(`organizations/${actor.orgId}/strategicMetricRegistry/${id}`);
  const beforeSnap = await ref.get();
  const before = beforeSnap.exists ? (beforeSnap.data() as StrategicMetricDefinition) : undefined;
  const status = String(input.status || before?.status || 'draft') as StrategicMetricDefinition['status'];
  if (!['draft', 'approved', 'deprecated'].includes(status)) {
    throw new ApiError(400, 'Invalid metric status.', 'invalid_metric_status');
  }
  if (status === 'approved' && !has(actor, 'peopleanalytics.approve') && !has(actor, 'strategy.approve')) {
    throw new ApiError(403, 'Analytics or strategy approval permission is required to approve a metric definition.', 'forbidden');
  }
  const row: StrategicMetricDefinition = {
    id,
    code: String(input.code ?? before?.code ?? '').trim().toUpperCase(),
    name: String(input.name ?? before?.name ?? '').trim(),
    businessDefinition: String(input.businessDefinition ?? before?.businessDefinition ?? '').trim(),
    formula: String(input.formula ?? before?.formula ?? '').trim(),
    grain: String(input.grain ?? before?.grain ?? '').trim(),
    sourceEntities: Array.isArray(input.sourceEntities)
      ? input.sourceEntities.map(String).map((value) => value.trim()).filter(Boolean).slice(0, 30)
      : before?.sourceEntities || [],
    owner: String(input.owner ?? before?.owner ?? '').trim(),
    freshnessSlaMinutes: Number(input.freshnessSlaMinutes ?? before?.freshnessSlaMinutes ?? 1440),
    status,
    version: before ? before.version + 1 : 1,
    createdBy: before?.createdBy || actor.uid,
    createdAt: before?.createdAt || now(),
    updatedBy: actor.uid,
    updatedAt: now(),
  };
  const issues = metricDefinitionIssues(row);
  if (issues.length) throw new ApiError(400, 'Metric definition is incomplete.', 'invalid_metric_definition', { issues });

  const audit = buildAudit(actor, {
    action: 'strategic.metric_definition.update',
    entityType: 'strategicMetricDefinition',
    entityId: id,
    before,
    after: row,
  });
  const batch = adminDb().batch();
  batch.set(ref, row, { merge: false });
  batch.create(adminDb().doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit);
  await batch.commit();
  return row;
}

export async function getStrategicAutomationPolicy(actor: ActorContext): Promise<{
  policy: StrategicAutomationPolicy;
  actions: typeof STRATEGIC_ACTION_POLICIES;
}> {
  requireAny(actor, ['ai.use', 'strategy.read']);
  const snap = await adminDb().doc(`organizations/${actor.orgId}/settings/strategicAutomation`).get();
  const stored = snap.exists ? (snap.data() as StrategicAutomationPolicy) : undefined;
  return {
    policy: {
      autopilotLevel: normalizeAutopilotLevel(stored?.autopilotLevel ?? 2),
      updatedBy: stored?.updatedBy,
      updatedAt: stored?.updatedAt,
    },
    actions: STRATEGIC_ACTION_POLICIES,
  };
}

export async function saveStrategicAutomationPolicy(
  actor: ActorContext,
  raw: unknown,
): Promise<StrategicAutomationPolicy> {
  if (!has(actor, 'ai.manage')) throw new ApiError(403, 'AI management permission is required.', 'forbidden');
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const autopilotLevel = normalizeAutopilotLevel(input.autopilotLevel);
  const ref = adminDb().doc(`organizations/${actor.orgId}/settings/strategicAutomation`);
  const beforeSnap = await ref.get();
  const before = beforeSnap.exists ? beforeSnap.data() : undefined;
  const row: StrategicAutomationPolicy = { autopilotLevel, updatedBy: actor.uid, updatedAt: now() };
  const audit = buildAudit(actor, {
    action: 'ai.autopilot_policy.update',
    entityType: 'strategicAutomationPolicy',
    entityId: 'strategicAutomation',
    before,
    after: row,
    metadata: { redActionsRemainAssistOnly: true },
  });
  const batch = adminDb().batch();
  batch.set(ref, row, { merge: false });
  batch.create(adminDb().doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`), audit);
  await batch.commit();
  return row;
}

export async function fivePhaseDashboard(actor: ActorContext): Promise<StrategicFivePhaseDashboard> {
  if (!has(actor, 'strategy.read')) throw new ApiError(403, 'Strategy read permission is required.', 'forbidden');
  const [countryPacks, metrics, automation] = await Promise.all([
    listStrategicCountryPacks(actor),
    listStrategicMetrics(actor),
    getStrategicAutomationPolicy(actor),
  ]);
  const phases = baselineFivePhaseAssessment().map((item) => {
    if (item.id === 2) {
      const ready = countryPacks.filter((pack) => countryPackActivationBlockers(pack).length === 0).length;
      const score = Math.min(100, item.score + ready * 15);
      return { ...item, score, status: score >= 75 ? 'advanced' as const : score >= 40 ? 'in_progress' as const : 'major_gap' as const };
    }
    if (item.id === 3 && metrics.some((metric) => metric.status === 'approved')) {
      const score = Math.min(100, item.score + 5);
      return { ...item, score, status: score >= 75 ? 'advanced' as const : 'in_progress' as const };
    }
    return item;
  });
  return {
    generatedAt: now(),
    phases,
    overallScore: overallFivePhaseScore(phases),
    countryPacks,
    metricRegistryCount: metrics.length,
    approvedMetricCount: metrics.filter((metric) => metric.status === 'approved').length,
    automationPolicy: automation.policy,
    actionPolicies: [...automation.actions],
    guardrails: [
      'No country pack can become active without independent legal, payroll, golden-test and Arabic/RTL evidence.',
      'Red AI actions are assist-only at every Autopilot level.',
      'Amber AI actions require fresh authorized human approval before bounded execution.',
      'Strategic metrics disclose definition, formula, grain, sources, owner and freshness SLA.',
      'This release adds governance/runtime foundations only; it does not fabricate Saudi or UAE statutory rules.',
    ],
    nextPriorities: [
      'Load independently verified Saudi statutory rules and golden payroll cases.',
      'Load independently verified UAE mainland/free-zone rules and golden payroll cases.',
      'Bind official/approved GCC connector adapters through the existing integration runtime.',
      'Consolidate People, Skills and Compliance graph provenance and metric lineage.',
      'Add per-agent canary/kill-switch certification and tool-use red-team suites.',
      'Finish public developer API/webhook/SDK certification and the enterprise Trust Center.',
    ],
  };
}

function normalizeAutopilotLevel(value: unknown): AutopilotLevel {
  const level = Number(value);
  if (![1, 2, 3, 4, 5].includes(level)) {
    throw new ApiError(400, 'Autopilot level must be an integer from 1 to 5.', 'invalid_autopilot_level');
  }
  return level as AutopilotLevel;
}

function stringOrUndefined(value: unknown, fallback?: string): string | undefined {
  if (value === undefined) return fallback;
  const normalized = String(value || '').trim();
  return normalized || undefined;
}