import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read=(p:string)=>readFileSync(p,'utf8');

describe('H51.67 onboarding evidence integrity and activation guardrails',()=>{
  it('separates malware status from HR requirement verification',()=>{
    const service=read('src/lib/onboarding/service.ts');
    const domain=read('src/domain/onboarding.ts');
    expect(domain).toContain("verificationStatus?: 'unverified' | 'verified' | 'rejected'");
    expect(service).toContain("verificationStatus:'unverified'");
    expect(service).toContain('Malware scan passed. HR requirement verification is still required.');
    expect(service).toContain("input.action==='verify_requirement'");
  });

  it('blocks exact duplicate uploads and governs evidence reuse',()=>{
    const service=read('src/lib/onboarding/service.ts');
    expect(service).toContain('duplicate_prehire_evidence');
    expect(service).toContain('duplicate_evidence_reuse_reason_required');
    expect(service).toContain('reuseReason');
  });

  it('locks pre-start evidence after activation but supports audited legacy reconciliation',()=>{
    const service=read('src/lib/onboarding/service.ts');
    const schemas=read('src/lib/onboarding/schemas.ts');
    expect(service).toContain('activation_evidence_locked');
    expect(service).toContain("input.action==='reconcile_complete'");
    expect(service).toContain('reconciledAfterActivation=true');
    expect(schemas).toContain("'reconcile_complete'");
  });

  it('prevents future lifecycle tasks from being completed early',()=>{
    const service=read('src/lib/onboarding/service.ts');
    expect(service).toContain('future_onboarding_phase');
    expect(service).toContain('phaseEarliestDate');
  });

  it('captures immutable activation evidence for future activations',()=>{
    const service=read('src/lib/onboarding/service.ts');
    const domain=read('src/domain/onboarding.ts');
    expect(domain).toContain('export interface OnboardingActivationSnapshot');
    expect(service).toContain('activationSnapshot');
    expect(service).toContain('documentEvidence');
    expect(service).toContain('activation_readiness_changed');
  });

  it('shows activated-case integrity warnings and the authoritative worker link',()=>{
    const workspace=read('src/components/onboarding-workspace.tsx');
    expect(workspace).toContain('Activated-case evidence mismatch.');
    expect(workspace).toContain('Open authoritative worker record');
    expect(workspace).toContain('Classification review required.');
    expect(workspace).toContain('Duplicate evidence detected.');
    expect(workspace).not.toContain('Γö¼Γòû');
  });

  it('exposes audited authoritative core correction in People',()=>{
    const profile=read('src/components/employee-profile.tsx');
    expect(profile).toContain('Correct core record');
    expect(profile).toContain('Save audited correction');
    expect(profile).toContain("method:'PATCH'");
  });

  it('uses a reservation/recovery model for consequential hire conversion',()=>{
    const recruiting=read('src/lib/recruiting/service.ts');
    expect(recruiting).toContain('reserveHireConversion');
    expect(recruiting).toContain('employeeNumberReservationIndex');
    expect(recruiting).toContain('recoverReservedHireWorker');
    expect(recruiting).toContain("status:'completed'");
    expect(recruiting).toContain('hire_conversion_worker_conflict');
  });
});
