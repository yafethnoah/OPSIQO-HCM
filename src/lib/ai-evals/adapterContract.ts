import type { EvalCommand, EvalContext, EvalObservation } from "./types";

export interface OpsiQoAiEvalAdapter {
  evaluate(command: EvalCommand, context: EvalContext): Promise<EvalObservation>;
}

/**
 * Integration contract:
 *
 * - Call the same governed interpreter/planner used by OPSIQO production.
 * - Evaluation must run in a non-mutating simulation mode.
 * - Do not expose raw HR records, prompts, documents, resumes, secrets, or PII.
 * - If the production path cannot safely simulate a case, return a blocked/not-executed
 *   observation instead of creating a test-only write path.
 */
