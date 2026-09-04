import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const employeeCreateSchema = z.object({
  legalFirstName: z.string().min(1).max(100),
  legalLastName: z.string().min(1).max(100),
  preferredName: z.string().max(100).optional(),
  workEmail: z.preprocess((value) => typeof value === 'string' && value.trim() === '' ? undefined : value, z.string().email().optional()),
  personalEmail: z.string().email().optional(),
  phone: z.string().max(40).optional(),
  employeeNumber: z.string().trim().min(1).max(40).optional(),
  employmentType: z.enum(['permanent', 'temporary', 'contractor', 'intern', 'volunteer']),
  hireDate: isoDate,
  positionId: z.string().optional(),
  orgUnitId: z.string().optional(),
  managerWorkerId: z.string().optional(),
});

export const employeeCoreCorrectionSchema = z.object({
  legalFirstName: z.string().trim().min(1).max(100),
  legalLastName: z.string().trim().min(1).max(100),
  preferredName: z.string().trim().max(100).optional().default(''),
  workEmail: z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().email().optional(),
  ),
  personalEmail: z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().email().optional(),
  ),
  phone: z.string().trim().max(40).optional().default(''),
  employeeNumber: z.string().trim().min(1).max(40),
  employmentType: z.enum(['permanent', 'temporary', 'contractor', 'intern', 'volunteer']),
  hireDate: isoDate,
  reason: z.string().trim().min(3).max(1000),
});

export const employeeDuplicateDeleteSchema = z.object({
  reason: z.string().trim().min(3).max(1000),
  confirmationEmployeeNumber: z.string().trim().min(1).max(40),
});

export const employeeChangeSchema = z.object({
  changeType: z.enum(['transfer', 'promotion', 'manager_change', 'status_change']),
  effectiveDate: isoDate,
  positionId: z.string().optional(),
  orgUnitId: z.string().optional(),
  managerWorkerId: z.string().optional(),
  workerStatus: z.enum(['active', 'inactive', 'leave', 'terminated']).optional(),
  note: z.string().max(1000).optional(),
}).superRefine((value, ctx) => {
  if ((value.changeType === 'transfer' || value.changeType === 'promotion') && (!value.positionId || !value.orgUnitId)) {
    ctx.addIssue({ code: 'custom', message: 'Transfer/promotion requires positionId and orgUnitId.' });
  }
  if (value.changeType === 'manager_change' && !value.managerWorkerId) {
    ctx.addIssue({ code: 'custom', message: 'Manager change requires managerWorkerId.' });
  }
  if (value.changeType === 'status_change' && !value.workerStatus) {
    ctx.addIssue({ code: 'custom', message: 'Status change requires workerStatus.' });
  }
});

export const secondaryAssignmentCreateSchema = z.object({
  employmentId: z.string().optional(),
  positionId: z.string().min(1),
  orgUnitId: z.string().min(1),
  managerWorkerId: z.string().optional(),
  allocationFte: z.number().min(0.05).max(1).default(0.25),
  startDate: isoDate,
});

export const secondaryAssignmentEndSchema = z.object({
  endDate: isoDate,
  note: z.string().max(1000).optional(),
});

export const positionCreateSchema = z.object({
  positionCode: z.string().min(1).max(40),
  title: z.string().min(1).max(160),
  orgUnitId: z.string().min(1),
  reportsToPositionId: z.string().optional(),
  status: z.enum(['planned', 'open', 'filled', 'frozen', 'closed']).default('open'),
  fte: z.number().min(0).max(2).default(1),
  headcountLimit: z.number().int().min(1).max(100).default(1),
  location: z.string().max(160).optional(),
  jobFamily: z.string().max(120).optional(),
  grade: z.string().max(40).optional(),
});

export const orgUnitCreateSchema = z.object({
  name: z.string().min(1).max(160),
  code: z.string().min(1).max(40),
  type: z.enum(['company', 'division', 'department', 'team', 'location']),
  parentId: z.string().optional(),
  managerWorkerId: z.string().optional(),
});

export const secondaryAssignmentPlanActionSchema = z.object({
  action: z.enum(['cancel', 'retry']),
});
