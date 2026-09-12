import { describe, expect, it } from 'vitest';
import type { StrategicCountryPack } from '@/domain/strategic-five-phase';
import {
  STRATEGIC_ACTION_POLICIES,
  baselineFivePhaseAssessment,
  countryPackActivationBlockers,
  defaultCountryPacks,
  evaluateStrategicAction,
  metricDefinitionIssues,
  overallFivePhaseScore,
} from '@/lib/strategic/five-phase-core';

describe('H51.38 five-phase strategic runtime foundation', () => {
  it('registers all five strategic phases with transparent checklist scoring', () => {
    const phases = baselineFivePhaseAssessment();
    expect(phases.map((phase) => phase.id)).toEqual([1, 2, 3, 4, 5]);
    expect(overallFivePhaseScore(phases)).toBeGreaterThan(0);
    expect(phases.every((phase) => phase.checklist.length > 0)).toBe(true);
  });

  it('creates Saudi and UAE packs as unverified drafts instead of fabricating compliance', () => {
    const packs = defaultCountryPacks();
    expect(packs.map((pack) => pack.country)).toEqual(['SA', 'AE']);
    expect(packs.every((pack) => pack.status === 'draft')).toBe(true);
    expect(packs.every((pack) => countryPackActivationBlockers(pack).length > 0)).toBe(true);
  });

  it('requires official, statutory, legal, payroll, golden-test and Arabic evidence before country activation', () => {
    const pack: StrategicCountryPack = {
      country: 'SA',
      name: 'Saudi Arabia',
      version: '1.0.0',
      status: 'approved',
      officialSources: ['https://example.invalid/official-source-placeholder'],
      statutoryRuleSetRef: 'rules/ksa/1.0.0',
      legalReviewRef: 'evidence/legal/1',
      payrollValidationRef: 'evidence/payroll/1',
      goldenTestEvidenceRef: 'evidence/golden/1',
      arabicQaEvidenceRef: 'evidence/rtl/1',
    };
    expect(countryPackActivationBlockers(pack)).toEqual([]);
  });

  it('keeps red actions assist-only even at Autopilot level 5', () => {
    expect(evaluateStrategicAction('red', 5, true)).toEqual(expect.objectContaining({
      allowed: false,
      mode: 'assist_only',
      requiresHumanApproval: true,
    }));
  });

  it('requires fresh approval before amber execution', () => {
    expect(evaluateStrategicAction('amber', 5, false).allowed).toBe(false);
    expect(evaluateStrategicAction('amber', 5, true)).toEqual(expect.objectContaining({
      allowed: true,
      mode: 'execute_after_approval',
    }));
  });

  it('allows configured green actions only at bounded automated levels', () => {
    expect(evaluateStrategicAction('green', 3).allowed).toBe(false);
    expect(evaluateStrategicAction('green', 4)).toEqual(expect.objectContaining({
      allowed: true,
      mode: 'execute',
    }));
  });

  it('contains explicit consequential action classifications outside the LLM', () => {
    expect(STRATEGIC_ACTION_POLICIES.find((item) => item.key === 'employee.terminate')?.actionClass).toBe('red');
    expect(STRATEGIC_ACTION_POLICIES.find((item) => item.key === 'compensation.change')?.actionClass).toBe('amber');
    expect(STRATEGIC_ACTION_POLICIES.find((item) => item.key === 'task.create')?.actionClass).toBe('green');
  });

  it('rejects semantic metrics without governed definition and lineage', () => {
    const issues = metricDefinitionIssues({
      code: 'KPI.TEST',
      name: 'Test KPI',
      businessDefinition: '',
      formula: '',
      grain: 'organization-month',
      sourceEntities: [],
      owner: 'People Analytics',
      freshnessSlaMinutes: 1440,
    });
    expect(issues).toContain('Business definition is required.');
    expect(issues).toContain('Formula is required.');
    expect(issues).toContain('At least one source entity is required.');
  });
});