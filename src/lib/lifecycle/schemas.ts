import { z } from 'zod';
export const replacementRequisitionSchema = z.object({
  employmentType: z.enum(['permanent','temporary','contractor','intern','volunteer']).optional(),
  location: z.string().max(160).optional(),
  description: z.string().max(6000).optional(),
});
