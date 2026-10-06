import { HRFormField, HRFormTemplate } from "./types";
import { evaluateFieldState } from "./conditional-engine";

export interface ValidationIssue {
  fieldId: string;
  code: string;
  message: string;
}

const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const urlRx = /^https?:\/\/\S+$/i;

export function validateSubmission(
  template: HRFormTemplate,
  answers: Record<string, unknown>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const walk = (fields: HRFormField[]) => {
    for (const field of fields) {
      const state = evaluateFieldState(field, answers);
      if (!state.visible) continue;

      const value = answers[field.id];
      const empty = value === undefined || value === null || value === "" ||
        (Array.isArray(value) && value.length === 0);

      if (state.required && empty) {
        issues.push({ fieldId: field.id, code: "required", message: `${field.label} is required.` });
        continue;
      }
      if (empty) {
        if (field.children?.length) walk(field.children);
        continue;
      }

      for (const rule of field.validation ?? []) {
        if (rule.kind === "email" && !emailRx.test(String(value)))
          issues.push({ fieldId: field.id, code: "email", message: rule.message });
        if (rule.kind === "url" && !urlRx.test(String(value)))
          issues.push({ fieldId: field.id, code: "url", message: rule.message });
        if (rule.kind === "min" && Number(value) < Number(rule.value))
          issues.push({ fieldId: field.id, code: "min", message: rule.message });
        if (rule.kind === "max" && Number(value) > Number(rule.value))
          issues.push({ fieldId: field.id, code: "max", message: rule.message });
        if (rule.kind === "regex" && rule.value) {
          const rx = new RegExp(String(rule.value));
          if (!rx.test(String(value))) issues.push({ fieldId: field.id, code: "regex", message: rule.message });
        }
      }

      if (field.children?.length) walk(field.children);
    }
  };

  walk(template.fields);
  return issues;
}

export function assertTemplatePublishable(template: HRFormTemplate): string[] {
  const issues: string[] = [];
  if (!template.formCode.trim()) issues.push("Form code is required.");
  if (!template.title.trim()) issues.push("Title is required.");
  if (!template.organizationId.trim()) issues.push("Organization scope is required.");
  if (!template.version.trim()) issues.push("Version is required.");
  if (!template.ownerUserId && !template.ownerDepartmentId) issues.push("A controlled owner is required.");
  if (template.fields.length === 0) issues.push("At least one field is required.");
  if (template.status === "published" && !template.approvedBy) issues.push("Published forms must have approval evidence.");
  return issues;
}
