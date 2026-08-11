import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoDateTime = z.string().datetime({ offset: true }).or(z.string().datetime());
const employmentType = z.enum(['permanent', 'temporary', 'contractor', 'intern', 'volunteer']);

export const requisitionCreateSchema = z.object({
  title: z.string().min(2).max(160), positionId: z.string().min(1), orgUnitId: z.string().min(1), hiringManagerWorkerId: z.string().min(1), employmentType,
  headcount: z.number().int().min(1).max(100).default(1), location: z.string().max(160).optional(), description: z.string().max(12000).optional(),
  requirements: z.array(z.string().min(1).max(500)).max(40).default([]),
});
export const requisitionActionSchema = z.object({ action: z.enum(['submit', 'approve', 'open', 'hold', 'cancel', 'close']) });
export const candidateApplicationCreateSchema = z.object({
  requisitionId: z.string().min(1), firstName: z.string().min(1).max(100), lastName: z.string().min(1).max(100), email: z.string().email(),
  phone: z.string().max(50).optional(), location: z.string().max(160).optional(), source: z.string().max(120).optional(), linkedinUrl: z.string().url().optional(),
  resumeText: z.string().max(100000).optional(), consent: z.boolean().default(false),
}).refine(v => v.consent, { message: 'Candidate consent is required before storing application data.', path: ['consent'] });
export const applicationStageSchema = z.object({ stage: z.enum(['applied', 'screening', 'interview', 'assessment', 'rejected', 'withdrawn']), dispositionReason: z.string().max(1000).optional() });
export const interviewCreateSchema = z.object({ applicationId: z.string().min(1), interviewType: z.enum(['screening', 'structured', 'panel', 'technical', 'final']), scheduledAt: isoDateTime, durationMinutes: z.number().int().min(15).max(480).default(60), interviewerWorkerIds: z.array(z.string().min(1)).min(1).max(12), location: z.string().max(240).optional(), meetingUrl: z.string().url().optional() });
export const scorecardCreateSchema = z.object({ recommendation: z.enum(['strong_yes', 'yes', 'mixed', 'no', 'strong_no']), ratings: z.array(z.object({ criterion: z.string().min(1).max(160), rating: z.number().int().min(1).max(5), evidence: z.string().max(1200).optional() })).min(1).max(30), overallComment: z.string().max(3000).optional() });
export const offerCreateSchema = z.object({ applicationId: z.string().min(1), currency: z.string().length(3).transform(v => v.toUpperCase()), baseSalary: z.number().nonnegative().optional(), hourlyRate: z.number().nonnegative().optional(), bonusTargetPct: z.number().min(0).max(500).optional(), startDate: isoDate, expiresAt: isoDate.optional(), notes: z.string().max(5000).optional() }).refine(v => v.baseSalary != null || v.hourlyRate != null, { message: 'Either baseSalary or hourlyRate is required.' });
export const offerActionSchema = z.object({ action: z.enum(['submit', 'approve', 'send', 'accept', 'decline', 'withdraw']) });
export const hireConversionSchema = z.object({ applicationId: z.string().min(1), offerId: z.string().min(1), employeeNumber: z.string().min(1).max(40), workEmail: z.string().email(), hireDate: isoDate, employmentType, legalFirstName:z.string().min(1).max(100).optional(), legalLastName:z.string().min(1).max(100).optional(), preferredName:z.string().max(100).optional(), personalEmail:z.string().email().optional(), phone:z.string().max(50).optional() });
