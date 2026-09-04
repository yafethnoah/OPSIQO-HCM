import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { parseResumeTextDeterministic } from '@/lib/recruiting/ats-engine';
import { applicationDispositionSchema, applicationStageSchema } from '@/lib/recruiting/schemas';

const read=(p:string)=>fs.readFileSync(p,'utf8');

describe('OPSIQO H43 recruiting auto-enrollment and disposition',()=>{
  it('extracts a candidate name from a safe resume filename fallback when the visible first line is a job title',()=>{
    const parsed=parseResumeTextDeterministic(`Digital Marketing & Growth Specialist\njia.tan@example.com\n(249) 357-7065\nLocation: Mississauga, ON`,`ResumeJiaYeeTan.pdf`);
    expect(parsed.firstName).toBe('Jia');
    expect(parsed.lastName).toBe('Tan');
    expect(parsed.displayName).toBe('Jia Yee Tan');
    expect(parsed.email).toBe('jia.tan@example.com');
    expect(parsed.location).toBe('Mississauga, ON');
  });

  it('keeps routine stage progression separate from final disposition',()=>{
    expect(applicationStageSchema.parse({stage:'screening'}).stage).toBe('screening');
    expect(()=>applicationStageSchema.parse({stage:'rejected'})).toThrow();
    expect(()=>applicationStageSchema.parse({stage:'withdrawn'})).toThrow();
    expect(applicationDispositionSchema.parse({action:'reject',reason:'Reviewed role requirements not met',confirm:true}).action).toBe('reject');
    expect(()=>applicationDispositionSchema.parse({action:'reject',reason:'No',confirm:false})).toThrow();
  });

  it('preserves consent, open-requisition and idempotency controls',()=>{
    const service=read('src/lib/recruiting/service.ts');
    const intake=read('src/components/resume-intake-assistant.tsx');
    expect(service).toContain("req.status !== 'open'");
    expect(service).toContain('candidateApplicationIndex');
    expect(service).toContain('deduplicated: true');
    expect(intake).toContain('consent.checked');
    expect(intake).toContain('options.length === 1');
    expect(intake).toContain('form.requestSubmit()');
  });

  it('prevents generic rejection and requires a governed review flow',()=>{
    const workspace=read('src/components/recruiting-workspace.tsx');
    const schemas=read('src/lib/recruiting/schemas.ts');
    expect(workspace).toContain('Review rejection…');
    expect(workspace).toContain('Confirm rejection');
    expect(workspace).toContain('ATS scores never trigger this action automatically');
    expect(schemas).toContain('applicationDispositionSchema');
  });

  it('repairs dynamic React values being reverted by legacy DOM translation',()=>{
    const source=read('src/lib/opsiqo-one/legacy-surface-i18n.ts');
    expect(source).toContain('refreshSource');
    expect(source).toContain('refreshAttrSource');
    expect(source).toContain('stillRendered');
  });
});
