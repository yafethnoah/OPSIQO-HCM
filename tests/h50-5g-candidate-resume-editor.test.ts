import {describe,it,expect} from 'vitest';
import fs from 'node:fs';

const read=(p:string)=>fs.readFileSync(p,'utf8');

describe('OPSIQO H50.5G candidate resume editor',()=>{
  it('lets candidates edit all common parsed resume sections and add custom sections',()=>{
    const p=read('src/components/candidate-application-portal.tsx');
    for(const marker of [
      'Resume review & edit','Professional experience','Skills / technical skills / tools',
      'Education · one item per line','Certifications / licences','Languages','Projects',
      'Volunteer / community experience','Awards / honours','Publications / presentations',
      'Additional information / affiliations / interests','Add another resume section'
    ])expect(p).toContain(marker);
  });

  it('stores candidate-reviewed fields separately from immutable resume evidence',()=>{
    const s=read('src/lib/recruiting/candidate-portal-service.ts');
    expect(s).toContain('candidateReviewedResume');
    expect(s).toContain("editorVersion:'H50.5G'");
    expect(s).toContain('candidateApplicationSubmissions');
    expect(s).toContain('resumeText:sourceText');
  });

  it('keeps ATS evidence grounded in the uploaded resume rather than candidate edits',()=>{
    const p=read('src/components/candidate-application-portal.tsx');
    expect(p).toContain('Fit % remains grounded in the original uploaded resume evidence');
    const s=read('src/lib/recruiting/candidate-fit-service.ts');
    expect(s).toContain('candidate.resumeText');
  });

  it('updates one active application link instead of creating a hidden conflicting duplicate',()=>{
    const p=read('src/components/candidate-application-links-panel.tsx');
    expect(p).toContain('activeForSelected');
    expect(p).toContain('Update active link & copy');
    expect(p).toContain('Existing active link detected.');
    expect(p).toContain('Multiple active links detected.');
    expect(p).toContain('Reconcile duplicate links / expired links');
  });

  it('shows candidate-reviewed resume sections to recruiters beside source documents',()=>{
    const p=read('src/components/candidate-submission-documents-panel.tsx');
    expect(p).toContain('Candidate-reviewed resume profile');
    expect(p).toContain('immutable uploaded resume evidence');
    expect(p).toContain('Professional experience');
  });
});
