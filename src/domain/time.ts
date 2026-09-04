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
  geofenceMode?: GeofenceMode;
  requireDeviceVerification?: boolean;
  allowOfflineClock?: boolean;
  requirePhotoProof?: boolean;
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

export type TimeEntrySource = 'web_clock' | 'offline_sync' | 'manual' | 'import';
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
  startEvidence?: ClockLocationEvidence;
  endEvidence?: ClockLocationEvidence;
  startPhotoEvidenceId?: string;
  endPhotoEvidenceId?: string;
  breakState?: 'working' | 'on_break';
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

export type GeofenceMode = 'disabled' | 'advisory' | 'enforce';
export type AttendanceLocationSource = 'browser' | 'native' | 'kiosk' | 'offline_sync';
export type DeviceVerificationMethod = 'none' | 'platform_authenticator' | 'native_biometric' | 'kiosk_pin';

export interface ClockLocationEvidence {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  capturedAt: string;
  source: AttendanceLocationSource;
  locationId?: string;
  distanceMeters?: number;
  insideGeofence?: boolean;
  deviceVerification?: DeviceVerificationMethod;
  integrityRisk?: 'none' | 'low' | 'medium' | 'high';
  integritySignals?: string[];
}

export interface WorkLocation {
  id: string;
  code: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  timezone: string;
  enabled: boolean;
  requireDeviceVerification: boolean;
  allowOfflineClock: boolean;
  requirePhotoProof: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ShiftStatus = 'draft' | 'published' | 'cancelled';
export interface ShiftAssignment {
  id: string;
  workerId: string;
  title: string;
  startAt: string;
  endAt: string;
  locationId?: string;
  requiredSkillCodes?: string[];
  minimumRestHours?: number;
  status: ShiftStatus;
  note?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BreakEvent {
  id: string;
  timeEntryId: string;
  workerId: string;
  startAt: string;
  endAt?: string;
  paid: boolean;
  minutes?: number;
  createdAt: string;
  updatedAt: string;
}

export type ExpenseClaimStatus = 'draft' | 'submitted' | 'manager_approved' | 'finance_approved' | 'rejected' | 'paid' | 'cancelled';
export interface ExpenseReceipt {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  storagePath: string;
  sha256: string;
  uploadedAt: string;
}
export interface ExpenseClaim {
  id: string;
  workerId: string;
  expenseDate: string;
  merchant?: string;
  category: string;
  currency: string;
  amount: number;
  taxAmount?: number;
  businessPurpose: string;
  projectCode?: string;
  costCenter?: string;
  receiptRequired: boolean;
  receipts: ExpenseReceipt[];
  status: ExpenseClaimStatus;
  submittedAt?: string;
  managerApprovedAt?: string;
  managerApprovedBy?: string;
  financeApprovedAt?: string;
  financeApprovedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  paidAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
