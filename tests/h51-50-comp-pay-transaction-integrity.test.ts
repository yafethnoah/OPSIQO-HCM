import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { evaluateCompensationPayrollSync } from '@/lib/compensation/payroll-sync-authority';
import { missingExplicitProfileInputFields, missingPayrollProfileReviewFields } from '@/lib/payroll/profile-integrity';
import { findRegisteredPayrollProvider, PAYROLL_PROVIDER_REGISTRY } from '@/lib/payroll/provider-registry';

describe('H51.50 Payroll + Compensation Transaction Integrity',()=>{
  it('uses one sync authority for missing, stale and reviewed evidence',()=>{
    const comp={id:'c1'} as any;
    expect(evaluateCompensationPayrollSync(comp,undefined)).toMatchObject({state:'missing_sync_evidence',requiresAttention:true});
    expect(evaluateCompensationPayrollSync(comp,{compensationRecordId:'old',status:'reviewed'})).toMatchObject({state:'stale_compensation_record',requiresAttention:true});
    expect(evaluateCompensationPayrollSync(comp,{compensationRecordId:'c1',status:'reviewed'})).toMatchObject({state:'reviewed',requiresAttention:false});
  });
  it('treats missing profile input as unknown rather than zero',()=>{
    expect(missingExplicitProfileInputFields({province:'ON',payPeriodsPerYear:26} as any)).toContain('federalClaimAmount');
    expect(missingPayrollProfileReviewFields({reviewedFields:['province','payPeriodsPerYear']} as any)).toContain('provincialClaimAmount');
  });
  it('uses registered provider combinations',()=>{
    const p=PAYROLL_PROVIDER_REGISTRY[0]!;
    expect(findRegisteredPayrollProvider(p.code,p.adapterCode,p.mappingVersions[0]!,'uat')).toBeTruthy();
    expect(findRegisteredPayrollProvider(p.code,'free-text-adapter',p.mappingVersions[0]!,'uat')).toBeUndefined();
  });
  it('requires explicit profile confirmation',()=>{
    const s=readFileSync('src/lib/payroll/control-plane.ts','utf8');
    expect(s).toContain('Unknown is not zero');
    expect(s).toContain('reviewConfirmed');
    expect(s).toContain('reviewedFields');
  });
  it('counts sync attention consistently',()=>{
    for(const path of ['src/lib/payroll/readiness.ts','src/lib/compensation/readiness.ts','src/lib/payroll/operations-intelligence-service.ts','src/lib/compensation/operations-intelligence-service.ts']){
      expect(readFileSync(path,'utf8')).toContain('syncRequiresAttention');
    }
  });
  it('shows evidence comparison before sync confirmation',()=>{
    const ui=readFileSync('src/components/compensation-operational-closure.tsx','utf8');
    const service=readFileSync('src/lib/compensation/operational-closure.ts','utf8');
    expect(ui).toContain('Compensation → Payroll Evidence Comparison');
    expect(ui).toContain('Confirm reviewed synchronization');
    expect(service).toContain('comparisons');
    expect(service).toContain('firstAffectedPayrollDate');
    expect(service).toContain("status: 'reviewed'");
  });
  it('fails closed on zero-pay off-cycle compensation',()=>{
    expect(readFileSync('src/lib/compensation/service.ts','utf8')).toContain('zero_pay_requires_classification');
    expect(readFileSync('src/components/compensation-workspace.tsx','utf8')).toContain('amount<=0');
  });
  it('consolidates operational UX into tabs',()=>{
    const p=readFileSync('src/components/payroll-operational-closure.tsx','utf8');
    const c=readFileSync('src/components/compensation-operational-closure.tsx','utf8');
    for(const x of ['Readiness','Profiles','Calendars','Adjustments','Runs','Reconciliation'])expect(p).toContain(x);
    for(const x of ['Readiness','Employees','Changes','Sync Review'])expect(c).toContain(x);
  });
  it('applies responsive table protections',()=>{
    const css=readFileSync('src/app/globals.css','utf8');
    expect(css).toContain('.compPayWideTable');
    expect(css).toContain('.compPayActionRow');
    expect(readFileSync('src/components/payroll-workspace.tsx','utf8')).toContain('compPayWideTable');
    expect(readFileSync('src/components/compensation-workspace.tsx','utf8')).toContain('compPayWideTable');
  });
  it('keeps country-specific compliance out of generic Payroll',()=>{
    const p=readFileSync('src/components/payroll-operational-closure.tsx','utf8')+readFileSync('src/components/payroll-workspace.tsx','utf8');
    expect(p).not.toContain('GOSI regime');
    expect(p).not.toContain('SaudiPayrollGuardPanel');
    expect(p).not.toContain('OntarioComplianceReadiness');
  });
});