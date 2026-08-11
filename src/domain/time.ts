export type LeaveUnit = 'hours' | 'days';
export type LeaveAccrualMethod = 'annual_grant' | 'monthly' | 'none';
export type LeaveRequestStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveType {
  id: string;
  code: string;
  name: string;
  description?: string;
  paid: boolean;
  statutory: boolean;
  jobProtected: boolean;
  unit: LeaveUnit;
  accrualMethod: LeaveAccrualMethod;
  annualEntitlementHours: number;
  monthlyAccrualHours?: number;
  carryoverLimitHours: number;
  negativeBalanceAllowed: boolean;
  partialDayCharging: 'actual_hours' | 'full_scheduled_day';
  requiresApproval: boolean;
  evidencePolicy?: string;
  jurisdiction?: string;
  legalReferenceUrl?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalance {
  id: string;
  workerId: string;
  leaveTypeId: string;
  year: number;
  openingHours: number;
  accruedHours: number;
  usedHours: number;
  pendingHours: number;
  adjustmentHours: number;
  availableHours: number;
  calculatedAt: string;
}

export interface LeaveRequest {
  id: string;
  workerId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  requestedHours: number;
  chargedHours: number;
  note?: string;
  status: LeaveRequestStatus;
  submittedBy: string;
  submittedAt: string;
  actedBy?: string;
  actedAt?: string;
  actionNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HolidayCalendar {
  id: string;
  name: string;
  jurisdiction: string;
  timezone: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Holiday {
  id: string;
  calendarId: string;
  date: string;
  name: string;
  paidPublicHoliday: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TimeComplianceMode = 'advisory' | 'enforce';
export interface TimePolicy {
  id: string;
  name: string;
  jurisdiction: string;
  timezone: string;
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  standardDailyHours: number;
  regularWeeklyHours: number;
  overtimeThresholdHours: number;
  overtimeMultiplier: number;
  maxDailyHours: number;
  maxWeeklyHours: number;
  minDailyRestHours: number;
  minBetweenShiftsHours: number;
  weeklyRestHours: number;
  mealBreakAfterHours: number;
  mealBreakMinutes: number;
  roundingMinutes: number;
  complianceMode: TimeComplianceMode;
  captureGeolocation: boolean;
  electronicMonitoringPolicyId?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerTimeProfile {
  id: string;
  workerId: string;
  timePolicyId: string;
  holidayCalendarId?: string;
  workingDays: number[];
  standardDailyHours: number;
  overtimeEligible: boolean;
  exemptionNote?: string;
  createdAt: string;
  updatedAt: string;
}

export type TimeEntrySource = 'web_clock' | 'manual' | 'import';
export type TimeEntryStatus = 'open' | 'complete' | 'corrected';
export interface TimeEntry {
  id: string;
  workerId: string;
  startAt: string;
  endAt?: string;
  breakMinutes: number;
  workedMinutes?: number;
  source: TimeEntrySource;
  status: TimeEntryStatus;
  note?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type TimeExceptionType = 'missing_clock_out' | 'daily_hours' | 'weekly_hours' | 'insufficient_shift_rest' | 'meal_break' | 'overtime';
export interface TimeException {
  id: string;
  workerId: string;
  type: TimeExceptionType;
  severity: 'info' | 'warning' | 'high';
  workDate?: string;
  weekStart?: string;
  observedValue?: number;
  thresholdValue?: number;
  status: 'open' | 'acknowledged' | 'resolved';
  message: string;
  createdAt: string;
  updatedAt: string;
}

export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export interface Timesheet {
  id: string;
  workerId: string;
  weekStart: string;
  weekEnd: string;
  regularMinutes: number;
  overtimeMinutes: number;
  paidLeaveMinutes: number;
  totalMinutes: number;
  status: TimesheetStatus;
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollExportRun {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: 'generated';
  timesheetCount: number;
  generatedBy: string;
  generatedAt: string;
}
