import { z } from 'zod';
import { WORKFLOW_TRIGGER_VALUES } from '@/domain/workflow';

const conditionSchema = z.object({
  field: z.string().regex(/^(?:entityType|entityId|payload\.[A-Za-z0-9_.-]+)$/).max(160),
  operator: z.enum(['eq','neq','contains','in','exists','gt','gte','lt','lte']),
  value: z.union([z.string().max(1000),z.number(),z.boolean(),z.array(z.string().max(300)).max(50)]).optional(),
}).superRefine((value,ctx)=>{if(value.operator!=='exists'&&value.value===undefined)ctx.addIssue({code:'custom',message:'Workflow condition value is required for this operator.'});});

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
  trigger: z.enum(WORKFLOW_TRIGGER_VALUES),
  conditions: z.array(conditionSchema).max(20).default([]),
  conditionMode: z.enum(['all','any']).default('all'),
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
