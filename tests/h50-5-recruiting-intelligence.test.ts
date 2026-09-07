import fs from 'node:fs';import {describe,expect,it} from 'vitest';import type {AtsResumeReview} from '../src/domain/ats';import {summarizeAtsFit} from '../src/lib/recruiting/candidate-fit-service';
import {parseResumeTextDeterministic} from '../src/lib/recruiting/ats-engine';
const read=(p:string)=>fs.readFileSync(p,'utf8');
describe('H50.5 Recruiting Intelligence',()=>{
 it('summarizes explainable fit dimensions',()=>{const r={id:'r',score:87,band:'strong_alignment',breakdown:{requirements:92},evidence:[{confidence:.9},{confidence:.8}],assessmentCoverage:90,missingRequirements:['gap'],scoringVersion:'test',createdAt:'2026-09-07T00:00:00.000Z'} as unknown as AtsResumeReview;expect(summarizeAtsFit(r)).toMatchObject({overallFit:87,requirementsCoverage:92,evidenceConfidence:85,assessmentCoverage:90,gapCount:1,humanReviewRequired:true})});
 it('has public resume-first application experience',()=>{const p=read('src/components/candidate-application-portal.tsx');for(const x of ['Resume','Cover letter','LinkedIn','Portfolio / website','Other social/professional profile','Save & continue later'])expect(p).toContain(x);expect(p).not.toContain('atsLatestScore');expect(p).not.toContain('overallFit')});
 it('keeps public routes App Check protected and rate limited',()=>{for(const p of ['src/app/api/public/recruiting/apply/[token]/route.ts','src/app/api/public/recruiting/apply/[token]/parse/route.ts','src/app/api/public/recruiting/apply/[token]/submit/route.ts'])expect(read(p)).toContain('verifyAppCheckRequest');const s=read('src/lib/recruiting/candidate-portal-service.ts');expect(s).toContain('publicRecruitingRateLimits');expect(s).toContain('adminBucket()');expect(s).toContain('unsafe_screening_question')});
 it('auto-scores every stored submitted resume path',()=>{const f=read('src/lib/recruiting/candidate-fit-service.ts'),s=read('src/lib/recruiting/service.ts');for(const x of ['autoScoreStoredApplication','atsLatestRequirementsCoverage','atsLatestEvidenceConfidence','atsLatestGapCount','humanReviewRequired:true'])expect(f).toContain(x);expect(s).toContain('autoScoreStoredApplication')});
 it('adds recruiter ranking, public links and document evidence',()=>{const w=read('src/components/recruiting-workspace.tsx'),f=read('src/components/candidate-fit-board.tsx');expect(w).toContain('<CandidateFitBoard');expect(w).toContain('<CandidateApplicationLinksPanel');expect(w).toContain('<CandidateSubmissionDocumentsPanel');expect(f).toContain('Highest fit');expect(f).toContain('Evidence confidence');expect(f).toContain('Refresh all resume fit')});
 it('keeps public candidate application content full-width instead of the hidden-sidebar grid column',()=>{const css=read('src/app/globals.css');expect(css).toContain('H50.5D candidate application public-shell UAT closure');expect(css).toContain('body:has(.prehireShell) .shell{display:block!important');expect(css).toContain('body:has(.prehireShell) .main{width:100%!important');expect(css).toContain('body:has(.prehireShell) .prehireMain{width:100%!important');});
 it('keeps the application-link form reference valid across async creation',()=>{const p=read('src/components/candidate-application-links-panel.tsx');expect(p).toContain('const form=e.currentTarget');expect(p).toContain('const f=new FormData(form)');expect(p).toContain('form.reset()');expect(p).not.toContain('e.currentTarget.reset()')});
 it('does not misclassify a candidate name plus credential as location and surfaces header credentials',()=>{const r=parseResumeTextDeterministic(`SHADI ALKTAIFAN, CHRE
Senior HR Executive
Mississauga, Ontario
shadi@example.com
PROFESSIONAL SUMMARY
Strategic HR leadership and organizational transformation.
EXPERIENCE
HR Director
Example Organization
January 2020 - Present
EDUCATION
Bachelor of Science`,'Shadi_Alktaifan_CHRE_Professional_HR_Resume.docx');expect(r.firstName).toBe('SHADI');expect(r.lastName).toBe('ALKTAIFAN');expect(r.location).toBe('Mississauga, Ontario');expect(r.location).not.toContain('CHRE');expect(r.headline).toBe('Senior HR Executive');expect(r.certifications).toContain('CHRE')});
 it('preserves protected-trait and human-decision guardrails',()=>{expect(read('src/lib/recruiting/candidate-portal-service.ts')).toContain('unsafe_screening_question');expect(read('src/components/candidate-fit-board.tsx')).toContain('does not auto-reject, auto-hire or auto-advance');expect(read('src/lib/recruiting/ats-engine.ts')).toContain('PROTECTED')});
});
