import { describe, expect, it } from 'vitest';
import { studioEnhanceSchema, studioGenerateSchema } from '@/lib/hr-forms-workflows/studio-schemas';
import { packBlueprints } from '@/lib/hr-forms-workflows/professional-blueprints';

describe('H51.79 resilient intelligent form generation',()=>{
  it('keeps form generation promptless from the client',()=>{
    expect(()=>studioGenerateSchema.parse({intent:'onboarding',output:'pack',prompt:'client prompt'})).toThrow();
  });
  it('supports controlled retry metadata without accepting prompts',()=>{
    const parsed=studioEnhanceSchema.parse({intent:'onboarding',output:'pack',templateIds:['t1','t2'],targetKind:'worker',targetId:'w1'});
    expect(parsed.templateIds).toHaveLength(2);
    expect(()=>studioEnhanceSchema.parse({intent:'onboarding',output:'pack',templateIds:['t1'],prompt:'not allowed'})).toThrow();
  });
  it('keeps deterministic professional packs available independently of AI',()=>{
    expect(packBlueprints('recruitment').length).toBeGreaterThanOrEqual(6);
    expect(packBlueprints('onboarding').length).toBeGreaterThanOrEqual(7);
    expect(packBlueprints('offboarding').length).toBeGreaterThanOrEqual(7);
  });
});
