import type { EvidenceRef } from './types';

export interface WorkforceMetricSnapshot {
  headcount: number;
  vacancies: number;
  payrollCost: number;
  overtimeHours: number;
  regrettableAttritionRisk: number;
  criticalSkillCoverage: number;
}

export interface WorkforceScenario {
  scenarioId: string;
  orgId: string;
  name: string;
  assumptions: string[];
  evidenceRefs: EvidenceRef[];
  baseline: WorkforceMetricSnapshot;
  proposed: WorkforceMetricSnapshot;
}

export interface WorkforceImpactPreview {
  scenarioId: string;
  orgId: string;
  deltas: WorkforceMetricSnapshot;
  warnings: string[];
  assumptions: string[];
  evidenceRefs: EvidenceRef[];
}

export function previewWorkforceImpact(
  scenario: WorkforceScenario,
): WorkforceImpactPreview {
  if (scenario.assumptions.length === 0) {
    throw new Error('scenario assumptions are required');
  }

  const deltas: WorkforceMetricSnapshot = {
    headcount: scenario.proposed.headcount - scenario.baseline.headcount,
    vacancies: scenario.proposed.vacancies - scenario.baseline.vacancies,
    payrollCost: scenario.proposed.payrollCost - scenario.baseline.payrollCost,
    overtimeHours: scenario.proposed.overtimeHours - scenario.baseline.overtimeHours,
    regrettableAttritionRisk:
      scenario.proposed.regrettableAttritionRisk -
      scenario.baseline.regrettableAttritionRisk,
    criticalSkillCoverage:
      scenario.proposed.criticalSkillCoverage -
      scenario.baseline.criticalSkillCoverage,
  };

  const warnings: string[] = [];
  if (deltas.regrettableAttritionRisk > 0) warnings.push('attrition risk increases');
  if (deltas.criticalSkillCoverage < 0) warnings.push('critical skill coverage decreases');
  if (deltas.payrollCost > 0) warnings.push('payroll cost increases');

  return {
    scenarioId: scenario.scenarioId,
    orgId: scenario.orgId,
    deltas,
    warnings,
    assumptions: scenario.assumptions,
    evidenceRefs: scenario.evidenceRefs,
  };
}
