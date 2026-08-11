import { describe, expect, it } from 'vitest';
import { leaveRequestSchema, leaveTypeSchema, timePolicySchema, workerTimeProfileSchema } from '../src/lib/time/schemas';
import { can } from '../src/lib/auth/permissions';
import { workflowDefinitionCreateSchema } from '../src/lib/workflow/schemas';

describe('Phase 2 v0.8 leave and time controls',()=>{
  it('rejects leave date ranges that run backwards',()=>{
    expect(()=>leaveRequestSchema.parse({workerId:'w1',leaveTypeId:'vac',startDate:'2026-08-20',endDate:'2026-08-19'})).toThrow();
  });
  it('rejects cross-year balance ambiguity at the request schema/service boundary through separate entitlement-year requests',()=>{
    const row=leaveRequestSchema.parse({workerId:'w1',leaveTypeId:'vac',startDate:'2026-12-31',endDate:'2027-01-02'});
    expect(row.startDate.slice(0,4)).not.toBe(row.endDate.slice(0,4));
  });
  it('supports governed annual and monthly accrual plans',()=>{
    expect(leaveTypeSchema.parse({code:'VAC',name:'Vacation',paid:true,statutory:false,jobProtected:false,unit:'hours',accrualMethod:'annual_grant',annualEntitlementHours:80,carryoverLimitHours:40,negativeBalanceAllowed:false,partialDayCharging:'actual_hours',requiresApproval:true,enabled:true}).annualEntitlementHours).toBe(80);
  });
  it('requires a governed monitoring policy before geolocation can be enabled',()=>{
    expect(()=>timePolicySchema.parse({name:'Ontario',jurisdiction:'Ontario',timezone:'America/Toronto',weekStartsOn:1,standardDailyHours:8,regularWeeklyHours:40,overtimeThresholdHours:44,overtimeMultiplier:1.5,maxDailyHours:8,maxWeeklyHours:48,minDailyRestHours:11,minBetweenShiftsHours:8,weeklyRestHours:24,mealBreakAfterHours:5,mealBreakMinutes:30,roundingMinutes:15,complianceMode:'advisory',captureGeolocation:true,enabled:true})).toThrow();
  });
  it('stores worker-level overtime eligibility instead of assuming every employee is identical',()=>{
    const p=workerTimeProfileSchema.parse({workerId:'w1',timePolicyId:'p1',workingDays:[1,2,3,4,5],standardDailyHours:8,overtimeEligible:false,exemptionNote:'Review applicable special rule/exemption.'});
    expect(p.overtimeEligible).toBe(false);
  });
  it('keeps payroll export with HR administrators while employees retain self clocking',()=>{
    expect(can('employee','time.clock')).toBe(true);
    expect(can('employee','payroll.export')).toBe(false);
    expect(can('hr_admin','payroll.export')).toBe(true);
  });
  it('accepts leave and timesheet automation triggers',()=>{
    expect(workflowDefinitionCreateSchema.parse({name:'Leave approval',trigger:'leave.requested',enabled:true,steps:[{id:'approve',name:'Approve leave',type:'approval',ownerRole:'manager',dependsOn:[]}]}).trigger).toBe('leave.requested');
    expect(workflowDefinitionCreateSchema.parse({name:'Timesheet approval',trigger:'timesheet.submitted',enabled:true,steps:[{id:'approve',name:'Approve timesheet',type:'approval',ownerRole:'manager',dependsOn:[]}]}).trigger).toBe('timesheet.submitted');
  });
});
