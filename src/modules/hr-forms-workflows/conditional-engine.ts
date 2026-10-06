import { HRCondition, HRFormField } from "./types";

export type ConditionContext = Record<string, unknown>;

function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
}

export function conditionMatches(condition: HRCondition, ctx: ConditionContext): boolean {
  const actual = ctx[condition.sourceFieldId];
  const expected = condition.value;

  switch (condition.operator) {
    case "equals": return actual === expected;
    case "not_equals": return actual !== expected;
    case "contains":
      return Array.isArray(actual)
        ? actual.includes(expected)
        : String(actual ?? "").toLowerCase().includes(String(expected ?? "").toLowerCase());
    case "greater_than": return Number(actual) > Number(expected);
    case "less_than": return Number(actual) < Number(expected);
    case "selected": return Array.isArray(actual) ? actual.includes(expected) : actual === expected;
    case "not_selected": return Array.isArray(actual) ? !actual.includes(expected) : actual !== expected;
    case "empty": return isEmpty(actual);
    case "not_empty": return !isEmpty(actual);
    default: return false;
  }
}

export interface EvaluatedFieldState {
  visible: boolean;
  required: boolean;
  triggeredActions: HRCondition[];
}

export function evaluateFieldState(field: HRFormField, ctx: ConditionContext): EvaluatedFieldState {
  let visible = true;
  let required = Boolean(field.required);
  const triggeredActions: HRCondition[] = [];

  for (const condition of field.conditions ?? []) {
    if (!conditionMatches(condition, ctx)) continue;
    triggeredActions.push(condition);
    if (condition.action === "show_field" && condition.targetId === field.id) visible = true;
    if (condition.action === "hide_field" && condition.targetId === field.id) visible = false;
    if (condition.action === "require_field" && condition.targetId === field.id) required = true;
  }

  return { visible, required, triggeredActions };
}

export function collectWorkflowActions(fields: HRFormField[], ctx: ConditionContext): HRCondition[] {
  const all: HRCondition[] = [];
  const walk = (items: HRFormField[]) => {
    for (const field of items) {
      for (const c of field.conditions ?? []) {
        if (
          conditionMatches(c, ctx) &&
          ["assign_reviewer", "create_task", "start_workflow_branch", "skip_section"].includes(c.action)
        ) all.push(c);
      }
      if (field.children?.length) walk(field.children);
    }
  };
  walk(fields);
  return all;
}
