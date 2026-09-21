import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { caseActionSchema, prehireDocumentActionSchema, staffTaskActionSchema } from '@/lib/onboarding/schemas';
import { employeeCoreCorrectionSchema } from '@/lib/hr/schemas';

const read=(p:string)=>readFileSync(p,'utf8');

describe('H51.68 legacy onboarding reconciliation + verification UX',()=>{
  it('rejects generic HR verification notes',()=>{
    expect(prehireDocumentActionSchema.safeParse({action:'verify_requirement',verificationNote:'completed'}).success).toBe(false);
    expect(prehireDocumentActionSchema.safeParse({action:'verify_requirement',verificationNote:'HR reviewed the signed agreement and confirmed both required signatures are present.'}).success).toBe(true);
  });

  it('requires substantive post-activation reconciliation reasons',()=>{
    expect(staffTaskActionSchema.safeParse({action:'reconcile_complete',note:'done'}).success).toBe(false);
    expect(staffTaskActionSchema.safeParse({action:'reconcile_complete',note:'HR reviewed the original onboarding evidence and confirmed the missing control is satisfied.'}).success).toBe(true);
  });

  it('requires a server preview and explicit confirmation before legacy repair',()=>{
    expect(caseActionSchema.safeParse({action:'apply_legacy_reconciliation',previewId:'p1',confirm:true,reason:'Reviewed legacy evidence and authorized correction of impossible historical workflow states.'}).success).toBe(true);
    expect(caseActionSchema.safeParse({action:'apply_legacy_reconciliation',previewId:'p1',confirm:false,reason:'Reviewed legacy evidence and authorized correction of impossible historical workflow states.'}).success).toBe(false);
  });

  it('requires evidence-based People core-correction reasons',()=>{
    const base={legalFirstName:'Denzel',legalLastName:'Nondo',preferredName:'',workEmail:'shared@example.org',personalEmail:'person@example.org',phone:'4165550100',employeeNumber:'EMP-1',employmentType:'contractor',hireDate:'2026-09-14'};
    expect(employeeCoreCorrectionSchema.safeParse({...base,reason:'done'}).success).toBe(false);
    expect(employeeCoreCorrectionSchema.safeParse({...base,reason:'The signed governing agreement confirms contractor status and this corrects the authoritative record.'}).success).toBe(true);
  });

  it('creates a deterministic preview and stale-preview guard',()=>{
    const service=read('src/lib/onboarding/service.ts');
    expect(service).toContain('buildLegacyReconciliationPlan');
    expect(service).toContain('repairFingerprint');
    expect(service).toContain('reconciliation_preview_stale');
    expect(service).toContain("sourceRelease:'H51.68'");
  });

  it('normalizes legacy signing notes without calling them malware evidence',()=>{
    const service=read('src/lib/onboarding/service.ts');
    const workspace=read('src/components/onboarding-workspace.tsx');
    expect(service).toContain('normalize_legacy_scan_note');
    expect(service).toContain('invalid_scan_evidence_semantics');
    expect(workspace).toContain('<strong>Legacy note:</strong>');
  });

  it('repairs premature lifecycle completion but preserves original evidence in reconciliation metadata',()=>{
    const service=read('src/lib/onboarding/service.ts');
    expect(service).toContain('reset_premature_lifecycle_task');
    expect(service).toContain('previousCompletedAt');
    expect(service).toContain('Legacy premature completion reset by governed H51.68 reconciliation.');
  });

  it('groups evidence by SHA-256 while retaining per-requirement verification',()=>{
    const workspace=read('src/components/onboarding-workspace.tsx');
    expect(workspace).toContain('One evidence group per SHA-256');
    expect(workspace).toContain('Each HR requirement keeps its own verification decision.');
    expect(workspace).toContain('Used for:');
  });

  it('keeps the H51.67 activated-evidence lock and hire-reservation controls intact',()=>{
    const onboarding=read('src/lib/onboarding/service.ts');
    const recruiting=read('src/lib/recruiting/service.ts');
    expect(onboarding).toContain('activation_evidence_locked');
    expect(recruiting).toContain('reserveHireConversion');
    expect(recruiting).toContain('employeeNumberReservationIndex');
  });
});
