import { describe, expect, it } from 'vitest';
import { can } from '../src/lib/auth/permissions';
import { candidateTaskActionSchema, caseActionSchema, createPrehireSchema, prehireProfileSchema } from '../src/lib/onboarding/schemas';

describe('Phase 2 onboarding schemas',()=>{
  it('requires an accepted-offer handoff payload with controlled access duration',()=>{
    expect(createPrehireSchema.safeParse({offerId:'offer-1',employeeNumber:'EMP-100',workEmail:'new@example.org',employmentType:'permanent',accessDays:30}).success).toBe(true);
    expect(createPrehireSchema.safeParse({offerId:'offer-1',employeeNumber:'EMP-100',workEmail:'bad',employmentType:'permanent',accessDays:120}).success).toBe(false);
  });
  it('requires explicit confirmation for candidate task completion',()=>{
    expect(candidateTaskActionSchema.safeParse({action:'acknowledge',confirmation:false}).success).toBe(false);
    expect(candidateTaskActionSchema.safeParse({action:'acknowledge',confirmation:true}).success).toBe(true);
  });
  it('validates core prehire identity fields and controlled case actions',()=>{
    expect(prehireProfileSchema.safeParse({legalFirstName:'Taylor',legalLastName:'Chen',personalEmail:'taylor@example.com',emergencyContactName:'Jordan Chen',emergencyContactRelationship:'Partner',emergencyContactPhone:'416-555-0100'}).success).toBe(true);
    expect(caseActionSchema.safeParse({action:'activate'}).success).toBe(true);
    expect(caseActionSchema.safeParse({action:'force_hire'}).success).toBe(false);
  });
});

describe('Phase 2 onboarding RBAC',()=>{
  it('lets managers manage their scoped onboarding tasks but not activate employment',()=>{
    expect(can('manager','onboarding.read')).toBe(true);
    expect(can('manager','onboarding.manage')).toBe(true);
    expect(can('manager','onboarding.activate')).toBe(false);
  });
  it('separates HR partner journey management from HR admin activation',()=>{
    expect(can('hr_partner','onboarding.manage')).toBe(true);
    expect(can('hr_partner','onboarding.activate')).toBe(false);
    expect(can('hr_admin','onboarding.activate')).toBe(true);
  });
});
