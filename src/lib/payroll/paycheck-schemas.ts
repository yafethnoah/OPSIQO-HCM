import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const paycheckMarkPaidSchema = z.object({
  paidDate: date,
  paymentReference: z.string().trim().max(160).optional(),
  note: z.string().trim().max(2000).optional(),
});

export const paycheckLedgerFilterSchema = z.object({
  status: z.enum(['all', 'upcoming', 'due_today', 'overdue', 'paid']).default('all'),
  from: date.optional(),
  to: date.optional(),
  runId: z.string().trim().max(180).optional(),
  workerId: z.string().trim().max(180).optional(),
  asOf: date.optional(),
}).refine(
  (value) => !value.from || !value.to || value.from <= value.to,
  { message: 'Paycheck export start date must be on or before end date.' },
);
