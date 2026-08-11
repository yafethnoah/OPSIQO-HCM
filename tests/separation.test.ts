import { describe, expect, it } from 'vitest';
import { can } from '../src/lib/auth/permissions';
import { exitInterviewSchema, separationActionSchema, separationCreateSchema } from '../src/lib/separation/schemas';
import { workflowDefinitionCreateSchema } from '../src/lib/workflow/schemas';

describe('Phase 2 v0.9 separation controls',()=>{
  it('rejects a last working date after the separation effective date',()=>{
    expect(separationCreateSchema.safeParse({workerId:'w1',separationType:'resignation',effectiveDate:'2026-08-20',lastWorkingDate:'2026-08-21',reasonCategory:'Career change',employeeInitiated:true,regrettable:false}).success).toBe(false);
  });
  it('keeps automatic closure opt-in rather than silently enabled',()=>{
    const row=separationCreateSchema.parse({workerId:'w1',separationType:'resignation',effectiveDate:'2026-08-20',lastWorkingDate:'2026-08-20',reasonCategory:'Career change',employeeInitiated:true,regrettable:false});
    expect(row.autoCloseOnEffectiveDate).toBe(false);
  });
  it('accepts controlled legal review evidence without calculating entitlement automatically',()=>{
    const row=separationActionSchema.parse({action:'complete_legal_review',noticeMethod:'combination',statutoryNoticeWeeks:4,contractualNoticeWeeks:8,severanceReview:'potentially_applicable',massTerminationReview:'not_applicable',note:'Reviewed against current ESA, contract and applicable policies.'});
    expect(row.noticeMethod).toBe('combination');
    expect(row.note).toContain('ESA');
  });
  it('supports structured exit feedback and bounded themes',()=>{
    expect(exitInterviewSchema.safeParse({overallExperience:5,managerExperience:4,wouldReturn:true,themes:['career growth','manager support']}).success).toBe(true);
    expect(exitInterviewSchema.safeParse({overallExperience:7,themes:[]}).success).toBe(false);
  });
  it('separates request/manage/approval/closure authority',()=>{
    expect(can('employee','separation.request')).toBe(true);
    expect(can('manager','separation.request')).toBe(true);
    expect(can('manager','separation.approve')).toBe(false);
    expect(can('hr_partner','separation.manage')).toBe(true);
    expect(can('hr_partner','separation.close')).toBe(false);
    expect(can('hr_admin','separation.approve')).toBe(true);
    expect(can('hr_admin','separation.close')).toBe(true);
  });
  it('supports separation workflow triggers through the shared workflow engine',()=>{
    expect(workflowDefinitionCreateSchema.parse({name:'Separation readiness',trigger:'separation.ready',enabled:true,steps:[{id:'review',name:'Review',type:'approval',ownerRole:'hr_admin',dependsOn:[]}]}).trigger).toBe('separation.ready');
  });
});
