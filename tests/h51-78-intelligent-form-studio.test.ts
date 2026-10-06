import { describe, expect, it } from 'vitest';
import { studioGenerateSchema } from '@/lib/hr-forms-workflows/studio-schemas';
import { interviewBlueprint, packBlueprints, singleBlueprint } from '@/lib/hr-forms-workflows/professional-blueprints';

describe('H51.78 Intelligent Form Studio',()=>{
  it('does not accept a client-written prompt',()=>{
    expect(()=>studioGenerateSchema.parse({intent:'recruitment',output:'single',prompt:'user prompt should be rejected'})).toThrow();
  });
  it('builds complete recruitment packs',()=>{
    const forms=packBlueprints('recruitment');
    expect(forms.length).toBeGreaterThanOrEqual(6);
    expect(forms.map(x=>x.title)).toContain('Structured Interview Evaluation Form');
    expect(forms.every(x=>x.fields.length>0)).toBe(true);
  });
  it('builds complete onboarding and offboarding packs',()=>{
    expect(packBlueprints('onboarding').length).toBeGreaterThanOrEqual(7);
    expect(packBlueprints('offboarding').length).toBeGreaterThanOrEqual(7);
  });
  it('keeps interview scored questions and unscored followup separate',()=>{
    const b=interviewBlueprint();
    const flat=(b.fields.flatMap(x=>x.children||[]));
    expect(flat.some(x=>x.kind==='scale_1_5')).toBe(true);
    expect(flat.find(x=>x.id==='unscored_followup')?.scoring).toBeUndefined();
  });
  it('generates a professional primary form for every intent',()=>{
    const intents=['recruitment','interview','onboarding','employee_information','leave','performance','employee_relations','health_safety','accommodation','offboarding','contractor','custom'] as const;
    for(const intent of intents){
      const b=singleBlueprint(intent);
      expect(b.title.length).toBeGreaterThan(4);
      expect(b.fields.length).toBeGreaterThan(0);
    }
  });
});
