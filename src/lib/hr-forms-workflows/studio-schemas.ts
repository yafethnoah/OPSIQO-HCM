import { z } from 'zod';

export const studioIntentSchema = z.enum([
  'recruitment',
  'interview',
  'onboarding',
  'employee_information',
  'leave',
  'performance',
  'employee_relations',
  'health_safety',
  'accommodation',
  'offboarding',
  'contractor',
  'custom',
]);

export const studioTargetKindSchema = z.enum(['requisition','position','worker']).optional();

export const studioGenerateSchema = z.object({
  intent: studioIntentSchema,
  output: z.enum(['single','pack']).default('single'),
  targetKind: studioTargetKindSchema,
  targetId: z.string().trim().max(180).optional(),
  notes: z.string().trim().max(1200).optional(),
}).strict();

export type StudioIntent = z.infer<typeof studioIntentSchema>;
export type StudioGenerateInput = z.infer<typeof studioGenerateSchema>;
