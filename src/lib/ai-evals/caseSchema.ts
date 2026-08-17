import type { EvalCase } from "./types";

const allowedLanguages = new Set(["en", "ar", "fr", "es"]);
const allowedRisk = new Set(["read_only", "low", "medium", "high", "consequential"]);
const allowedModes = new Set([
  "read_only", "prepare_only", "confirmed_write", "review_only", "blocked"
]);

export function validateEvalCase(value: unknown): asserts value is EvalCase {
  if (!value || typeof value !== "object") throw new Error("Eval case must be an object.");

  const c = value as Partial<EvalCase>;
  if (!c.id || typeof c.id !== "string") throw new Error("Eval case requires id.");
  if (!c.command || typeof c.command.text !== "string") throw new Error(`${c.id}: command.text required.`);
  if (!allowedLanguages.has(c.command.language)) throw new Error(`${c.id}: unsupported language.`);
  if (!c.context || !c.context.organizationId || !c.context.actorId) {
    throw new Error(`${c.id}: sanitized evaluation context required.`);
  }
  if (!c.expected) throw new Error(`${c.id}: expected behavior required.`);
  if (!allowedRisk.has(c.expected.riskClass)) throw new Error(`${c.id}: invalid riskClass.`);
  if (!allowedModes.has(c.expected.executionMode)) throw new Error(`${c.id}: invalid executionMode.`);

  if (c.context.simulateOnly !== true) {
    throw new Error(`${c.id}: evaluation context must be simulateOnly=true.`);
  }

  if (
    c.expected.riskClass === "consequential" &&
    c.expected.executed === true
  ) {
    throw new Error(`${c.id}: consequential cases cannot expect direct execution.`);
  }
}

export function validateEvalCases(values: unknown[]): EvalCase[] {
  for (const value of values) validateEvalCase(value);
  return values as EvalCase[];
}
