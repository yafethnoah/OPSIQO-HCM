export const HR_FORMS_PERMISSIONS = [
  "hr_forms.view",
  "hr_forms.template.create",
  "hr_forms.template.edit",
  "hr_forms.template.review",
  "hr_forms.template.approve",
  "hr_forms.template.publish",
  "hr_forms.template.retire",
  "hr_forms.instance.create",
  "hr_forms.submit",
  "hr_forms.submission.view",
  "hr_forms.approve",
  "hr_forms.analytics.view",
  "hr_forms.governance.manage",
  "hr_forms.settings.manage",
  "hr_forms.ai.generate",
  "hr_forms.export"
] as const;

export type HRFormsPermission = typeof HR_FORMS_PERMISSIONS[number];
