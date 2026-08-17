import type { EvalCase, EvalReport } from "./types";
import type { OpsiQoAiEvalAdapter } from "./adapterContract";
import { evaluateCase, DIMENSION_THRESHOLDS } from "./scoring";

export async function runOpsiQoAiEvaluation(
  cases: EvalCase[],
  adapter: OpsiQoAiEvalAdapter
): Promise<EvalReport> {
  const results = [];

  for (const testCase of cases) {
    const observation = await adapter.evaluate(testCase.command, testCase.context);
    if (observation.caseId !== testCase.id) {
      throw new Error(
        `Adapter caseId mismatch: expected ${testCase.id}, got ${observation.caseId}`
      );
    }
    results.push(evaluateCase(testCase, observation));
  }

  const dimensions: EvalReport["dimensions"] = {};

  for (const [dimension, minimum] of Object.entries(DIMENSION_THRESHOLDS)) {
    let passed = 0;
    let total = 0;

    for (const result of results) {
      if (dimension in result.dimensionResults) {
        total += 1;
        if (result.dimensionResults[dimension]) passed += 1;
      }
    }

    const rate = total === 0 ? 0 : passed / total;
    dimensions[dimension] = {
      passed,
      total,
      rate,
      minimum,
      gatePass: total > 0 && rate >= minimum,
    };
  }

  const criticalFailureCount = results.reduce(
    (sum, result) => sum + result.criticalFailures.length,
    0
  );

  const dimensionGatePass = Object.values(dimensions).every(d => d.gatePass);
  const status =
    criticalFailureCount === 0 && dimensionGatePass
      ? "AI_QUALITY_GATE_PASS"
      : "AI_QUALITY_GATE_FAIL";

  return {
    schemaVersion: "7.2",
    generatedAtUtc: new Date().toISOString(),
    caseCount: results.length,
    passedCaseCount: results.filter(r => r.passed).length,
    failedCaseCount: results.filter(r => !r.passed).length,
    criticalFailureCount,
    dimensions,
    cases: results,
    status,
  };
}
