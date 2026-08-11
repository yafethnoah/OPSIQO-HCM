import { describe,it,expect } from 'vitest';
import { workforcePlanSchema, workforceScenarioSchema, workforceDemandSchema } from '@/lib/workforce-planning/schemas';

describe('workforce planning schemas',()=>{
  it('requires a valid planning horizon and explicit assumptions',()=>{
    expect(()=>workforcePlanSchema.parse({code:'PLAN_2027',name:'2027 Workforce Plan',planningStart:'2027-01-01',planningEnd:'2026-12-31',assumptions:{currency:'CAD',annualInflationPct:2,employerOnCostPct:15,vacancyCostPct:0,defaultSalaryGrowthPct:3,note:'Reviewed planning assumptions.'}})).toThrow();
  });
  it('rejects a scenario action that changes nothing',()=>{
    expect(()=>workforceScenarioSchema.parse({planId:'p1',name:'No-op',type:'baseline',actions:[{type:'hire',headcountDelta:0,fteDelta:0,annualBasePayDelta:0,effectiveDate:'2027-01-01',rationale:'This should fail because it changes nothing.'}]})).toThrow();
  });
  it('accepts human-entered demand with explicit target and rationale',()=>{
    const row=workforceDemandSchema.parse({planId:'p1',title:'Nursing demand',targetHeadcount:4,targetFte:4,targetDate:'2027-06-01',priority:'high',status:'approved',rationale:'Approved service-growth demand backed by the operating plan.',requiredSkillIds:[]});
    expect(row.targetFte).toBe(4);expect(row.status).toBe('approved');
  });
});
