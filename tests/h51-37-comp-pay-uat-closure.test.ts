import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { resolveWorkerPayDate } from '@/lib/payroll/pay-date';

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('H51.37 member-specific payroll release dates', () => {
  it('uses the run default release date when no member rule exists', () => {
    const r = resolveWorkerPayDate(
      { payDate: '2026-09-30' },
      undefined,
      'worker-a',
    );
    expect(r).toEqual({ payDate: '2026-09-30', source: 'run_default' });
  });

  it('applies a persistent member offset rule', () => {
    const r = resolveWorkerPayDate(
      { payDate: '2026-09-30' },
      { payDateOffsetDays: -5, weekendAdjustment: 'none' },
      'worker-a',
    );
    expect(r).toEqual({ payDate: '2026-09-25', source: 'profile_rule' });
  });

  it('supports a persistent fixed day of month for members with different salary release dates', () => {
    const r = resolveWorkerPayDate(
      { payDate: '2026-09-30' },
      { payDateRule: 'fixed_day_of_month', payDayOfMonth: 15, weekendAdjustment: 'none' },
      'worker-a',
    );
    expect(r).toEqual({ payDate: '2026-09-15', source: 'profile_rule' });
  });

  it('clamps day 31 to the actual month end', () => {
    const r = resolveWorkerPayDate(
      { payDate: '2027-02-26' },
      { payDateRule: 'fixed_day_of_month', payDayOfMonth: 31, weekendAdjustment: 'none' },
      'worker-a',
    );
    expect(r).toEqual({ payDate: '2027-02-28', source: 'profile_rule' });
  });

  it('applies the member weekend rule without pretending to know public holidays', () => {
    const r = resolveWorkerPayDate(
      { payDate: '2026-09-13' },
      { payDateOffsetDays: 0, weekendAdjustment: 'previous_weekday' },
      'worker-a',
    );
    expect(r).toEqual({ payDate: '2026-09-11', source: 'profile_rule' });
  });

  it('lets an exact run-level member date override the profile rule', () => {
    const r = resolveWorkerPayDate(
      { payDate: '2026-09-30', workerPayDates: { 'worker-a': '2026-09-22' } },
      { payDateOffsetDays: -5, weekendAdjustment: 'previous_weekday' },
      'worker-a',
    );
    expect(r).toEqual({ payDate: '2026-09-22', source: 'worker_override' });
  });
});

describe('H51.37 live-UAT closure contracts', () => {
  it('uses resolved member pay dates in calculation, adjustments, statements and provider export', () => {
    const source = read('src/lib/payroll/control-plane.ts');
    expect(source).toContain('resolveWorkerPayDate');
    expect(source).toContain('workerPayDate=release.payDate');
    expect(source).toContain('x.payDate===workerPayDate');
    expect(source).toContain('payDate:workerPayDate');
    expect(source).toContain('payDateSource:release.source');
    expect(source).toContain('resolvedWorkerPayDates:Object.fromEntries');
    expect(source).toContain('payment:{paymentMethodRef:x.paymentMethodRef||');
    expect(source).toContain('payDate:x.payDate');
    expect(source).toContain('const payDate=r.payDate||x.payDate||run.payDate');
  });

  it('keeps compensation effective date separate from payroll release date and writes synchronization evidence', () => {
    const source = read('src/lib/compensation/service.ts');
    expect(source).toContain('compensationPayrollSyncCurrent');
    expect(source).toContain("status:'payroll_review_required'");
    expect(source).toContain('compensationRecordId:id');
    expect(source).toContain('effectiveDate:x.effectiveDate');
  });

  it('fixes the live UAT compensation usability gaps', () => {
    const source = read('src/components/compensation-workspace.tsx');
    expect(source).toContain('Skill points');
    expect(source).toContain('Effort points');
    expect(source).toContain('Responsibility points');
    expect(source).toContain('Working conditions points');
    expect(source).toContain('Map position to salary band');
    expect(source).toContain('Employee placement');
    expect(source).toContain('Current stage');
    expect(source).toContain('Comp → Payroll');
    expect(source).toContain('Expected minimum pay');
    expect(source).toContain("basis==='hourly'?p.hourlyRate");
  });

  it('advances page-guide progress from real governed actions', () => {
    const layer = read('src/components/page-experience-layer.tsx');
    const compensation = read('src/components/compensation-workspace.tsx');
    const payroll = read('src/components/payroll-workspace.tsx');
    expect(layer).toContain("opsiqo:guide-progress");
    expect(compensation).toContain("opsiqo:guide-progress");
    expect(payroll).toContain("opsiqo:guide-progress");
  });

  it('provides a reviewed worker subset and member release-date controls in payroll', () => {
    const source = read('src/components/payroll-workspace.tsx');
    expect(source).toContain('Member-specific salary release dates');
    expect(source).toContain('Days from default');
    expect(source).toContain('Fixed day of month');
    expect(source).toContain('Day of month');
    expect(source).toContain('Exact date this run');
    expect(source).toContain('Default release date');
    expect(source).toContain('selectedWorkerIds');
    expect(source).toContain('unselect');
  });
});
