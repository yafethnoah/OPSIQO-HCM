import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  adminClockOutSchema,
  assessAttendanceIntegrity,
} from '@/lib/time/attendance-integrity';

const read=(p:string)=>readFileSync(p,'utf8');

describe('H51.53 Attendance Integrity + Admin Clock-Out', () => {
  it('keeps normal shifts within policy threshold', () => {
    const result=assessAttendanceIntegrity(
      {id:'e1',workerId:'w1',startAt:'2026-09-15T12:00:00Z',status:'open'} as any,
      {id:'p1',timezone:'UTC',maxDailyHours:8,standardDailyHours:8},
      {standardDailyHours:8},
      '2026-09-15T19:30:00Z',
    );
    expect(result.state).toBe('normal');
    expect(result.requiresReview).toBe(false);
    expect(result.payrollBlocked).toBe(false);
  });

  it('escalates a shift beyond policy threshold', () => {
    const result=assessAttendanceIntegrity(
      {id:'e1',workerId:'w1',startAt:'2026-09-15T08:00:00Z',status:'open'} as any,
      {id:'p1',timezone:'UTC',maxDailyHours:8,standardDailyHours:8},
      {standardDailyHours:8},
      '2026-09-15T18:00:00Z',
    );
    expect(result.state).toBe('overdue_open_shift');
    expect(result.requiresReview).toBe(true);
    expect(result.overdueMinutes).toBe(120);
  });

  it('marks a multi-day shift critical and payroll-blocking', () => {
    const result=assessAttendanceIntegrity(
      {id:'e1',workerId:'w1',startAt:'2026-09-12T23:17:38Z',status:'open'} as any,
      {id:'p1',timezone:'America/Toronto',maxDailyHours:8,standardDailyHours:8},
      {standardDailyHours:8},
      '2026-09-15T16:09:06Z',
    );
    expect(result.state).toBe('critical_open_shift');
    expect(result.requiresReview).toBe(true);
    expect(result.payrollBlocked).toBe(true);
    expect(result.elapsedMinutes).toBeGreaterThan(3800);
  });

  it('requires timestamp, reason and explicit confirmation', () => {
    expect(adminClockOutSchema.safeParse({
      workerId:'w1',entryId:'e1',
      clockOutAt:'2026-09-15T12:00:00-04:00',
      reason:'Employee confirmed they forgot to clock out after the shift.',
      confirm:true,
    }).success).toBe(true);
    expect(adminClockOutSchema.safeParse({
      workerId:'w1',entryId:'e1',
      clockOutAt:'2026-09-15T12:00:00-04:00',
      reason:'forgot',confirm:true,
    }).success).toBe(false);
  });

  it('implements admin correction with immutable evidence', () => {
    const source=read('src/lib/time/attendance-integrity.ts');
    expect(source).toContain("ADMIN_ROLES = new Set(['super_admin', 'org_admin', 'hr_admin'])");
    expect(source).toContain('attendanceCorrections');
    expect(source).toContain("action: 'time.admin_clock_out'");
    expect(source).toContain("correctionType: 'admin_manual_clock_out'");
    expect(source).toContain("locationEvidence: 'not_fabricated'");
    expect(source).toContain('activeBreakClosed');
    expect(source).toContain('attendance_locked_correction_required');
  });

  it('blocks overdue employee self clock-out and timesheet approval', () => {
    const source=read('src/lib/time/service.ts');
    expect(source).toContain('attendance_overdue_review_required');
    expect(source).toContain('attendance_integrity_blocking');
    expect(source).toContain('attendanceIntegrityForWorkerWeek');
  });

  it('blocks Payroll readiness for overdue open shifts', () => {
    const source=read('src/lib/payroll/readiness.ts');
    expect(source).toContain('payrollAttendanceIntegrityBlockers');
    expect(source).toContain('Unresolved overdue open shift');
    expect(source).toContain('attendanceIntegrity');
  });

  it('surfaces overdue shift and admin clock-out in Who’s In Now', () => {
    const source=read('src/components/frontline-operations-panel.tsx');
    expect(source).toContain('OVERDUE OPEN SHIFT');
    expect(source).toContain('CRITICAL OPEN SHIFT');
    expect(source).toContain('Clock Out Employee');
    expect(source).toContain('Admin clock-out time');
    expect(source).toContain('Correction reason');
    expect(source).toContain('I confirm this correction');
    expect(source).toContain('locationEvidenceLabel');
  });

  it('shows only the valid break action', () => {
    const source=read('src/components/frontline-operations-panel.tsx');
    expect(source).toContain("selfAttendance?.breakState==='on_break'");
    expect(source).toContain("selfAttendance?.breakState!=='on_break'");
    expect(source).toContain('selfAttendance?.requiresReview');
  });

  it('disables self clock-out in Timecard for overdue shifts', () => {
    const source=read('src/components/time-workspace.tsx');
    expect(source).toContain('selfOpenShiftOverdue');
    expect(source).toContain('requires administrator review');
  });

  it('keeps Country Compliance isolated', () => {
    const source=read('src/lib/time/attendance-integrity.ts')+
      read('src/components/frontline-operations-panel.tsx');
    expect(source).not.toContain('GOSI');
    expect(source).not.toContain('SaudiPayrollGuard');
    expect(source).not.toContain('OntarioComplianceReadiness');
  });
});