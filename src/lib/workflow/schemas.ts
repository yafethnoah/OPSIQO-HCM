import { z } from 'zod';

const stepSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(180),
  type: z.enum(['task', 'approval', 'notification']),
  ownerRole: z.string().max(80).optional(),
  dueInDays: z.number().int().min(0).max(365).optional(),
  dependsOn: z.array(z.string()).default([]),
  escalationOwnerRole: z.string().max(80).optional(),
  escalateAfterHours: z.number().int().min(0).max(24 * 30).optional(),
});

export const workflowDefinitionCreateSchema = z.object({
  name: z.string().min(1).max(180),
  description: z.string().max(1000).optional(),
  trigger: z.enum(['manual', 'employee.created', 'employee.updated', 'position.created', 'position.updated', 'requisition.created', 'requisition.opened', 'application.created', 'application.stage_changed', 'offer.accepted', 'hire.completed', 'onboarding.started', 'onboarding.ready', 'onboarding.activated', 'onboarding.completed', 'document.uploaded', 'document.expiring', 'policy.published', 'policy.review_due', 'policy.acknowledged', 'compliance.gap', 'leave.requested', 'leave.approved', 'timesheet.submitted', 'timesheet.approved', 'time.exception', 'separation.requested', 'separation.approved', 'separation.ready', 'separation.closed', 'separation.task_overdue', 'performance.cycle_started', 'performance.review_submitted', 'performance.calibrated', 'performance.goal_completed', 'performance.pip_started', 'performance.pip_overdue', 'learning.assigned', 'learning.completed', 'learning.skill_verified', 'learning.certificate_expiring', 'career.interest_created', 'succession.nomination_confirmed', 'succession.review_due', 'compensation.changed', 'compensation.cycle_opened', 'compensation.cycle_applied', 'compensation.pay_equity_review_due', 'er.case_opened', 'er.investigation_started', 'er.finding_recorded', 'er.action_overdue', 'er.case_closed', 'accommodation.review_due', 'safety.incident_reported', 'safety.investigation_started', 'safety.hazard_reported', 'safety.action_overdue', 'safety.incident_closed', 'experience.survey_published', 'experience.survey_closed', 'experience.feedback_submitted', 'service.ticket_created', 'service.ticket_sla_breached', 'service.ticket_resolved', 'recognition.sent', 'workforce.plan_approved', 'workforce.scenario_approved', 'workforce.demand_due', 'analytics.forecast_generated', 'analytics.forecast_approved']),
  enabled: z.boolean().default(true),
  steps: z.array(stepSchema).min(1).max(50),
}).superRefine((value, ctx) => {
  const ids = new Set(value.steps.map((s) => s.id));
  if (ids.size !== value.steps.length) ctx.addIssue({ code: 'custom', message: 'Workflow step IDs must be unique.' });
  for (const step of value.steps) {
    for (const dep of step.dependsOn) {
      if (!ids.has(dep)) ctx.addIssue({ code: 'custom', message: `Unknown dependency ${dep}.` });
      if (dep === step.id) ctx.addIssue({ code: 'custom', message: 'A step cannot depend on itself.' });
    }
  }
  const graph = new Map<string, string[]>(value.steps.map((s) => [s.id, s.dependsOn] as [string, string[]]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const hasCycle = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const dep of graph.get(id) || []) if (graph.has(dep) && hasCycle(dep)) return true;
    visiting.delete(id); visited.add(id); return false;
  };
  if (value.steps.some((s) => hasCycle(s.id))) ctx.addIssue({ code: 'custom', message: 'Workflow dependencies cannot contain cycles.' });
});

export const workflowRunCreateSchema = z.object({
  workflowId: z.string().min(1),
  entityType: z.string().max(100).optional(),
  entityId: z.string().max(180).optional(),
});

export const workflowStepActionSchema = z.object({
  action: z.enum(['start', 'complete', 'approve', 'reject', 'skip']),
  note: z.string().max(1000).optional(),
});
