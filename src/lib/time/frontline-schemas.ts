import { z } from 'zod';

export const workLocationSchema = z.object({
  code: z.string().min(2).max(30).transform(v=>v.trim().toUpperCase()),
  name: z.string().min(2).max(120),
  address: z.string().max(240).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMeters: z.number().int().min(25).max(50000).default(250),
  timezone: z.string().min(2).max(80).default('America/Toronto'),
  enabled: z.boolean().default(true),
  requireDeviceVerification: z.boolean().default(false),
  allowOfflineClock: z.boolean().default(false),
  requirePhotoProof: z.boolean().default(false),
});

export const shiftSchema = z.object({
  workerId: z.string().min(1),
  title: z.string().min(2).max(120),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  locationId: z.string().optional(),
  requiredSkillCodes: z.array(z.string().min(1).max(50)).max(30).optional(),
  minimumRestHours: z.number().min(0).max(48).optional(),
  status: z.enum(['draft','published','cancelled']).default('draft'),
  note: z.string().max(500).optional(),
}).refine(v=>v.endAt>v.startAt,{message:'Shift end must be after shift start.',path:['endAt']});

export const shiftActionSchema = z.object({
  action: z.enum(['publish','cancel']),
  reason: z.string().max(500).optional(),
});

export const breakActionSchema = z.object({
  action: z.enum(['start','end']),
  paid: z.boolean().default(false),
});

export const expenseClaimSchema = z.object({
  expenseDate: z.string().date(),
  merchant: z.string().max(160).optional(),
  category: z.string().min(2).max(80),
  currency: z.string().length(3).transform(v=>v.toUpperCase()),
  amount: z.number().positive().max(1_000_000),
  taxAmount: z.number().min(0).max(1_000_000).optional(),
  businessPurpose: z.string().min(3).max(1000),
  projectCode: z.string().max(80).optional(),
  costCenter: z.string().max(80).optional(),
  receiptRequired: z.boolean().default(true),
});

export const expenseActionSchema = z.object({
  action: z.enum(['submit','manager_approve','finance_approve','reject','mark_paid','cancel']),
  note: z.string().max(1000).optional(),
});
