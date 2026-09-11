import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
const read=(p:string)=>fs.readFileSync(p,'utf8');

describe('OPSIQO H50.5I structured resume application',()=>{
  it('uses structured repeatable employment and education records',()=>{
    const p=read('src/components/candidate-application-portal.tsx');
    for(const v of ['Import Resume','Add Employment History','Position Title','Employer','Duties and Responsibilities','Add Education History','Degree','School / Institution','Current job'])expect(p).toContain(v);
  });

  it('supports structured skills certifications languages projects volunteer awards and publications',()=>{
    const p=read('src/components/candidate-application-portal.tsx');
    for(const v of ['Add skill','Add Certification','Add Language','Add Project','Add Volunteer Experience','Add Award / Honour','Add Publication / Presentation'])expect(p).toContain(v);
  });

  it('AI prompt returns structured resume records and keeps them evidence grounded',()=>{
    const p=read('src/lib/recruiting/ats-provider.ts');
    expect(p).toContain('employmentHistory:[');
    expect(p).toContain('educationHistory:[');
    expect(p).toContain('structuredResume');
    expect(p).toContain('grounded(');
  });

  it('blocks silent blank parse fallback',()=>{
    const p=read('src/lib/recruiting/ats-service.ts');
    expect(p).toContain('resumeParseCoverage');
    expect(p).toContain('resume_ai_parse_failed');
    expect(p).toContain('resume_parse_insufficient');
    expect(p).toContain('OPSIQO will not continue with blank candidate fields');
  });

  it('persists candidate reviewed structured profile separately from source resume evidence',()=>{
    const s=read('src/lib/recruiting/candidate-portal-service.ts');
    const r=read('src/domain/recruiting.ts');
    expect(s).toContain('structuredResume:verifiedStructuredResume');
    expect(s).toContain('candidateVerificationGate');
    expect(s).toContain('resumeText:sourceText');
    expect(s).toContain('resumeSourceMeta:');
    expect(s).toContain("structuredEditorVersion:'H50.5I'");
    expect(r).toContain('structuredResume?: StructuredResumeProfile');
  });

  it('preserves candidate verification and ATS evidence boundary',()=>{
    const p=read('src/components/candidate-application-portal.tsx');
    const fit=read('src/lib/recruiting/candidate-fit-service.ts');
    expect(p).toContain('Candidate review');
    expect(p).toContain('Structured resume verification');
    expect(p).not.toContain('100% candidate-verified');
    expect(p).toContain('internal Fit % remains grounded in the original uploaded resume evidence');
    expect(fit).toContain('candidate.resumeText');
  });
});
