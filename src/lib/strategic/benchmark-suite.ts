export interface BenchmarkTarget {
  key: string;
  description: string;
  operator: '<=' | '>=' | '=';
  target: number;
  unit: 'seconds' | 'minutes' | 'percent' | 'count' | 'clicks';
}

export interface BenchmarkObservation {
  key: string;
  value: number;
}

export const strategicBenchmarks: readonly BenchmarkTarget[] = [
  { key: 'employee.add.seconds', description: 'Add employee', operator: '<=', target: 60, unit: 'seconds' },
  { key: 'requisition.create.seconds', description: 'Create requisition', operator: '<=', target: 90, unit: 'seconds' },
  { key: 'onboarding.human.minutes', description: 'Onboarding human effort', operator: '<=', target: 5, unit: 'minutes' },
  { key: 'leave.request.seconds', description: 'Request leave', operator: '<=', target: 20, unit: 'seconds' },
  { key: 'workflow.create.minutes', description: 'Create workflow', operator: '<=', target: 5, unit: 'minutes' },
  { key: 'employee.import500.minutes', description: 'Review 500-employee import', operator: '<=', target: 10, unit: 'minutes' },
  { key: 'dashboard.insight.minutes', description: 'Reach dashboard insight', operator: '<=', target: 2, unit: 'minutes' },
  { key: 'policy.answer.seconds', description: 'Policy answer', operator: '<=', target: 10, unit: 'seconds' },
  { key: 'compliance.impact.seconds', description: 'Compliance impact preview', operator: '<=', target: 60, unit: 'seconds' },
  { key: 'performance.setup.minutes', description: 'Performance cycle setup', operator: '<=', target: 5, unit: 'minutes' },
  { key: 'tenant.setup.minutes', description: 'Tenant setup', operator: '<=', target: 30, unit: 'minutes' },
  { key: 'common.action.clicks', description: 'Common actions', operator: '<=', target: 3, unit: 'clicks' },
  { key: 'conversation.completion.percent', description: 'Conversational completion', operator: '>=', target: 80, unit: 'percent' },
  { key: 'ai.evidence.percent', description: 'Material AI outputs with evidence', operator: '>=', target: 95, unit: 'percent' },
  { key: 'consequential.autonomous.count', description: 'Autonomous consequential decisions', operator: '=', target: 0, unit: 'count' },
] as const;

export interface BenchmarkResult {
  key: string;
  passed: boolean;
  observed: number;
  target: BenchmarkTarget;
}

export function evaluateBenchmarks(
  observations: readonly BenchmarkObservation[],
): BenchmarkResult[] {
  const byKey = new Map(observations.map((observation) => [observation.key, observation.value]));
  return strategicBenchmarks.map((target) => {
    const observed = byKey.get(target.key);
    if (observed === undefined) {
      return { key: target.key, passed: false, observed: Number.NaN, target };
    }

    const passed =
      target.operator === '<='
        ? observed <= target.target
        : target.operator === '>='
          ? observed >= target.target
          : observed === target.target;

    return { key: target.key, passed, observed, target };
  });
}

export function benchmarkPassRate(results: readonly BenchmarkResult[]): number {
  if (results.length === 0) return 0;
  return (results.filter((result) => result.passed).length / results.length) * 100;
}
