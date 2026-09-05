import {describe,expect,it} from 'vitest';
import fs from 'node:fs';

const workspace=fs.readFileSync('src/components/time-workspace.tsx','utf8');
const service=fs.readFileSync('src/lib/time/service.ts','utf8');
const route=fs.readFileSync('src/app/api/organizations/[orgId]/time/payroll-export/route.ts','utf8');

describe('H48.7 payroll period integrity',()=>{
  it('does not derive payroll period calendar dates through UTC rollover',()=>{
    expect(workspace).not.toContain("const isoDate=(d:Date)=>d.toISOString().slice(0,10);");
    expect(workspace).not.toContain('isoDate(new Date())');
    expect(workspace).toContain('payrollPeriodStart');
    expect(workspace).toContain('payrollPeriodEnd');
  });

  it('defaults payroll period from the authoritative weekly timesheet boundaries',()=>{
    expect(workspace).toContain('setPayrollPeriodStart(v=>v||t.data.weekStart)');
    expect(workspace).toContain('setPayrollPeriodEnd(v=>v||t.data.weekEnd)');
  });

  it('requires explicit editable payroll boundaries',()=>{
    expect(workspace).toContain('aria-label="Payroll period start"');
    expect(workspace).toContain('aria-label="Payroll period end"');
    expect(workspace).toContain('Select a valid payroll period start and end date.');
  });

  it('exports only approved timesheets fully contained in the selected period',()=>{
    expect(service).toContain(".where('status','==','approved')");
    expect(service).toContain('.filter(t=>t.weekStart>=periodStart&&t.weekEnd<=periodEnd)');
    expect(service).not.toContain('.filter(t=>t.weekEnd>=periodStart&&t.weekStart<=periodEnd)');
  });

  it('prevents oversized accidental payroll ranges',()=>{
    expect(service).toContain('periodDays>366');
    expect(service).toContain('invalid_period_range');
  });

  it('preserves payroll audit evidence and employee/time columns',()=>{
    expect(service).toContain("action:'payroll_export.generate'");
    expect(service).toContain('employee_number,employee_name,week_start,week_end,regular_hours,overtime_hours,paid_leave_hours,total_worked_hours');
  });

  it('serves payroll CSV as no-store',()=>{
    expect(route).toContain("'cache-control':'no-store, max-age=0'");
    expect(route).toContain("'cdn-cache-control':'no-store'");
  });

  it('preserves H48.6 and H48.5 behavior',()=>{
    expect(workspace).toContain('SELF_APPROVAL_OVERRIDE');
    expect(workspace).toContain('announceAttendanceChanged(action)');
  });
});
