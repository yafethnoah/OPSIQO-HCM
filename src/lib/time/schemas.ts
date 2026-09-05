import { z } from 'zod';

export const leaveTypeSchema = z.object({
  code: z.string().min(2).max(30).transform(v=>v.trim().toUpperCase()),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  paid: z.boolean().default(true),
  statutory: z.boolean().default(false),
  jobProtected: z.boolean().default(false),
  unit: z.enum(['hours','days']).default('hours'),
  accrualMethod: z.enum(['annual_grant','monthly','none']).default('annual_grant'),
  annualEntitlementHours: z.number().min(0).max(1000).default(0),
  monthlyAccrualHours: z.number().min(0).max(100).optional(),
  carryoverLimitHours: z.number().min(0).max(1000).default(0),
  negativeBalanceAllowed: z.boolean().default(false),
  partialDayCharging: z.enum(['actual_hours','full_scheduled_day']).default('actual_hours'),
  requiresApproval: z.boolean().default(true),
  evidencePolicy: z.string().max(500).optional(),
  jurisdiction: z.string().max(80).optional(),
  legalReferenceUrl: z.string().url().optional(),
  enabled: z.boolean().default(true),
});

export const leaveRequestSchema = z.object({
  workerId: z.string().min(1),
  leaveTypeId: z.string().min(1),
  startDate: z.string().date(),
  endDate: z.string().date(),
  requestedHours: z.number().positive().max(10000).optional(),
  note: z.string().max(1000).optional(),
}).refine(v=>v.endDate>=v.startDate,{message:'End date cannot be before start date.',path:['endDate']});

export const leaveActionSchema = z.object({action:z.enum(['approve','reject','cancel']),note:z.string().max(1000).optional()});

export const holidayCalendarSchema = z.object({name:z.string().min(2).max(120),jurisdiction:z.string().min(2).max(80),timezone:z.string().min(2).max(80),enabled:z.boolean().default(true)});
export const holidaySchema = z.object({calendarId:z.string().min(1),date:z.string().date(),name:z.string().min(2).max(120),paidPublicHoliday:z.boolean().default(true)});

export const timePolicySchema = z.object({
  name:z.string().min(2).max(120), jurisdiction:z.string().min(2).max(80), timezone:z.string().min(2).max(80),
  weekStartsOn:z.number().int().min(0).max(6).default(1), standardDailyHours:z.number().positive().max(24).default(8),
  regularWeeklyHours:z.number().positive().max(168).default(40), overtimeThresholdHours:z.number().positive().max(168).default(44), overtimeMultiplier:z.number().min(1).max(5).default(1.5),
  maxDailyHours:z.number().positive().max(24).default(8), maxWeeklyHours:z.number().positive().max(168).default(48), minDailyRestHours:z.number().min(0).max(24).default(11),
  minBetweenShiftsHours:z.number().min(0).max(24).default(8), weeklyRestHours:z.number().min(0).max(168).default(24), mealBreakAfterHours:z.number().positive().max(12).default(5), mealBreakMinutes:z.number().int().min(0).max(180).default(30), roundingMinutes:z.number().int().min(0).max(60).default(0),
  complianceMode:z.enum(['advisory','enforce']).default('advisory'), captureGeolocation:z.boolean().default(false), geofenceMode:z.enum(['disabled','advisory','enforce']).default('disabled'), requireDeviceVerification:z.boolean().default(false), allowOfflineClock:z.boolean().default(false), requirePhotoProof:z.boolean().default(false), electronicMonitoringPolicyId:z.string().optional(), enabled:z.boolean().default(true),
}).superRefine((v,ctx)=>{if((v.captureGeolocation||v.geofenceMode!=='disabled')&&!v.electronicMonitoringPolicyId)ctx.addIssue({code:'custom',message:'A governed electronic-monitoring policy is required before geolocation or geofencing can be enabled.',path:['electronicMonitoringPolicyId']});if(v.geofenceMode!=='disabled'&&!v.captureGeolocation)ctx.addIssue({code:'custom',message:'Geofencing requires geolocation capture to be enabled.',path:['captureGeolocation']});});

export const workerTimeProfileSchema = z.object({workerId:z.string().min(1),timePolicyId:z.string().min(1),holidayCalendarId:z.string().optional(),workingDays:z.array(z.number().int().min(0).max(6)).min(1),standardDailyHours:z.number().positive().max(24),overtimeEligible:z.boolean().default(true),exemptionNote:z.string().max(500).optional()});

export const clockLocationEvidenceSchema=z.object({latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180),accuracyMeters:z.number().min(0).max(100000).optional(),capturedAt:z.string().datetime().optional(),source:z.enum(['browser','native','kiosk','offline_sync']).default('browser'),deviceVerification:z.enum(['none','platform_authenticator','native_biometric','kiosk_pin']).default('none'),integritySignals:z.array(z.string().max(120)).max(12).optional()});
export const clockSchema=z.object({action:z.enum(['clock_in','clock_out']),breakMinutes:z.number().int().min(0).max(720).optional(),note:z.string().max(500).optional(),location:clockLocationEvidenceSchema.optional(),offlineEventId:z.string().uuid().optional(),clientCapturedAt:z.string().datetime().optional()});
export const manualTimeEntrySchema=z.object({workerId:z.string().min(1),startAt:z.string().datetime(),endAt:z.string().datetime(),breakMinutes:z.number().int().min(0).max(1440).default(0),note:z.string().max(500).optional()}).refine(v=>v.endAt>v.startAt,{message:'End time must be after start time.',path:['endAt']});
export const timesheetActionSchema=z.object({action:z.enum(['submit','approve','reject']),weekStart:z.string().date(),workerId:z.string().min(1),note:z.string().max(1000).optional()});
export const exceptionActionSchema=z.object({action:z.enum(['acknowledge','resolve']),note:z.string().max(1000).optional()});
