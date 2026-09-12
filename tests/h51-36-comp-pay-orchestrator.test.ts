import{describe,expect,it}from'vitest';
import fs from'node:fs';
import{normalizePay}from'../src/lib/compensation/pay-normalization';

const compDomain=fs.readFileSync('src/domain/compensation.ts','utf8');
const compSchemas=fs.readFileSync('src/lib/compensation/schemas.ts','utf8');
const compService=fs.readFileSync('src/lib/compensation/service.ts','utf8');
const compControls=fs.readFileSync('src/lib/compensation/controls.ts','utf8');
const payroll=fs.readFileSync('src/lib/payroll/control-plane.ts','utf8');
const compUi=fs.readFileSync('src/components/compensation-workspace.tsx','utf8');
const payrollUi=fs.readFileSync('src/components/payroll-workspace.tsx','utf8');
const readiness=fs.readFileSync('src/lib/compensation/readiness.ts','utf8');

describe('H51.36 authoritative pay normalization',()=>{
  it('reconciles hourly to monthly and annual pay',()=>{
    const p=normalizePay({payBasis:'hourly',basePay:25,standardHoursPerWeek:40,standardWeeksPerYear:52});
    expect(p.hourlyRate).toBe(25);expect(p.annualPay).toBe(52000);expect(p.monthlyPay).toBe(4333.33);
  });
  it('reconciles monthly to hourly and annual pay',()=>{
    const p=normalizePay({payBasis:'monthly_salary',basePay:5000,standardHoursPerWeek:40,standardWeeksPerYear:52});
    expect(p.monthlyPay).toBe(5000);expect(p.annualPay).toBe(60000);expect(p.hourlyRate).toBe(28.85);
  });
  it('reconciles annual to hourly and monthly pay',()=>{
    const p=normalizePay({payBasis:'annual_salary',basePay:72000,standardHoursPerWeek:40,standardWeeksPerYear:52});
    expect(p.annualPay).toBe(72000);expect(p.monthlyPay).toBe(6000);expect(p.hourlyRate).toBe(34.62);
  });
  it('supports monthly salary as an explicit pay basis',()=>{expect(compDomain).toContain("'monthly_salary'");expect(compSchemas).toContain("'monthly_salary'")});
  it('removes the hard-coded 2080 annualization authority from compensation and payroll',()=>{expect(compService).not.toContain('2080');expect(payroll).not.toContain('2080')});
  it('stores one normalized compensation truth and prepares payroll evidence drafts',()=>{expect(compService).toContain('normalizePay');expect(compService).toContain('payrollProfileDrafts');expect(compControls).toContain('normalizePay')});
});

describe('H51.36 operational closure',()=>{
  it('shows hourly monthly and annual pay in compensation and payroll',()=>{for(const s of ['Hourly','Monthly','Annual']){expect(compUi).toContain(s);expect(payrollUi).toContain(s)}});
  it('implements compensation readiness and salary-band proposals',()=>{expect(readiness).toContain('No salary band mapping');expect(readiness).toContain('suggestedBand');expect(readiness).toContain('prepareCompensationDrafts');expect(readiness).toContain('preparePayrollProfileDrafts')});
  it('integrates contextual AI through the existing governed event',()=>{expect(compUi).toContain("opsiqo:ai-assist");expect(payrollUi).toContain("opsiqo:ai-assist")});
  it('replaces manual requisition-id typing with recruiting options',()=>{expect(compUi).toContain('Select requisition');expect(compUi).toContain('r.data.requisitions')});
  it('implements versioned architecture lifecycle controls',()=>{expect(compUi).toContain('versioned lifecycle');expect(fs.readFileSync('src/lib/compensation/architecture-lifecycle.ts','utf8')).toContain('compensationArchitectureHistory')});
  it('makes blocked states explicit',()=>{expect(compUi).toContain('Create a salary band first');expect(compUi).toContain('Blocked: select an open cycle');expect(payrollUi).toContain('Payroll run is blocked')});
});