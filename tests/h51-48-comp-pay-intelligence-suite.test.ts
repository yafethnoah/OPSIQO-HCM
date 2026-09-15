import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';
import { detectStatementAnomalies, previewRetro, resolveCalendarPayDate } from '@/lib/payroll/operations-intelligence';

describe('H51.48 Compensation + Payroll Intelligence Suite',()=>{
  it('calculates deterministic retro pay by affected pay periods',()=>{
    expect(previewRetro({previousAnnualPay:80000,newAnnualPay:86000,payPeriodsPerYear:24,affectedPeriods:3})).toEqual({
      perPeriodDelta:250,retroAmount:750,affectedPeriods:3,
    });
  });

  it('supports fixed and last-business-day calendar rules',()=>{
    expect(resolveCalendarPayDate('2026-09-15',{id:'x',scope:'organization',rule:'fixed_day_of_month',dayOfMonth:25,weekendAdjustment:'none',effectiveDate:'2026-01-01',reason:'x',status:'active',createdBy:'x',createdAt:'x',updatedBy:'x',updatedAt:'x'}).payDate).toBe('2026-09-25');
    expect(resolveCalendarPayDate('2026-09-15',{id:'x',scope:'organization',rule:'last_business_day',weekendAdjustment:'none',effectiveDate:'2026-01-01',reason:'x',status:'active',createdBy:'x',createdAt:'x',updatedBy:'x',updatedAt:'x'}).payDate).toBe('2026-09-30');
  });

  it('detects material payroll variance without autonomously resolving it',()=>{
    const anomalies=detectStatementAnomalies([
      {workerId:'w1',runId:'r2',status:'final',payDate:'2026-09-15',gross:9000,net:7000},
      {workerId:'w1',runId:'r1',status:'final',payDate:'2026-08-31',gross:4500,net:3500},
    ],[{id:'w1',displayName:'Worker One'}]);
    expect(anomalies.length).toBeGreaterThan(0);
    expect(anomalies[0]?.explained).toBe(false);
  });

  it('extends controlled off-cycle run kinds',()=>{
    const domain=readFileSync('src/domain/payroll.ts','utf8');
    const schemas=readFileSync('src/lib/payroll/schemas.ts','utf8');
    for(const kind of ['bonus','commission','emergency','retro']){
      expect(domain).toContain(`'${kind}'`);
      expect(schemas).toContain(`'${kind}'`);
    }
  });

  it('adds payroll command center, retro, variable pay and anomaly intelligence',()=>{
    const ui=readFileSync('src/components/payroll-operations-command-center.tsx','utf8');
    const service=readFileSync('src/lib/payroll/operations-intelligence-service.ts','utf8');
    expect(ui).toContain('Payroll Intelligence Command Center');
    expect(ui).toContain('Payroll variance & anomaly intelligence');
    expect(service).toContain('createRetroCase');
    expect(service).toContain('createVariablePay');
    expect(service).toContain('createSpecialPayrollRun');
  });

  it('adds compensation command center and governed change workflow',()=>{
    const ui=readFileSync('src/components/compensation-operations-command-center.tsx','utf8');
    const service=readFileSync('src/lib/compensation/operations-intelligence-service.ts','utf8');
    expect(ui).toContain('Compensation Intelligence Command Center');
    expect(ui).toContain('Compensation → Payroll synchronization');
    expect(service).toContain('createCompensationChangeRequest');
    expect(service).toContain('compensation_maker_checker');
    expect(service).toContain('retro_workflow_required');
  });

  it('preserves AI consequential-action guardrails',()=>{
    const domain=readFileSync('src/domain/comp-pay-operations.ts','utf8');
    expect(domain).toContain('AI may not approve compensation changes');
    expect(domain).toContain('release payroll');
  });

  it('keeps country-specific compliance out of generic payroll',()=>{
    const payroll=readFileSync('src/components/payroll-workspace.tsx','utf8');
    expect(payroll).not.toContain('SaudiPayrollGuardPanel');
    expect(payroll).not.toContain('OntarioComplianceReadiness');
    expect(payroll).not.toContain('GOSI regime');
  });
});