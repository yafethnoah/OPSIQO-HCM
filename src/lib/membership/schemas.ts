import { z } from 'zod';

export const invitationCreateSchema = z.object({
  email: z.string().email(),
  role: z.enum(['org_admin', 'hr_admin', 'hr_partner', 'manager', 'employee']),
  workerId: z.string().optional(),
  expiresInDays: z.number().int().min(1).max(30).default(7),
  experience: z.enum(['standard', 'pulse']).default('standard'),
});

export const invitationAcceptSchema = z.object({
  token: z.string().min(32).max(512),
});

export const invitationActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('revoke'), reason: z.string().max(500).optional() }),
  z.object({
    action: z.literal('resend'),
    expiresInDays: z.number().int().min(1).max(30).default(7),
    experience: z.enum(['standard', 'pulse']).optional(),
  }),
]);

export const pulseInvitationResolveSchema = z.object({
  orgId: z.string().trim().min(1).max(200),
  token: z.string().min(32).max(512),
});