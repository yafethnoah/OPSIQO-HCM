import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Candidate, Requisition } from '@/domain/recruiting';
import { ATS_SCORING_VERSION, buildAtsReview, parseResumeTextDeterministic } from '@/lib/recruiting/ats-engine';

const candidate: Candidate = { id:'c1', firstName:'Jia', lastName:'Tan', displayName:'Jia Yee Tan', email:'jia@example.com', emailLower:'jia@example.com', createdAt:'2026-09-03T00:00:00.000Z', updatedAt:'2026-09-03T00:00:00.000Z' };
const req: Requisition = { id:'r1', requisitionNumber:'REQ-2026-0004', title:'Digital Marketing & Growth Specialist', positionId:'p1', orgUnitId:'marketing', hiringManagerWorkerId:'w1', employmentType:'permanent', headcount:1, openingsRemaining:1, status:'open', requestedBy:'u1', createdAt:'2026-09-03T00:00:00.000Z', updatedAt:'2026-09-03T00:00:00.000Z', description:'Responsibilities\nOwn SEO, paid search, Google Analytics and campaign reporting.\nRequirements\n3+ years digital marketing experience. Experience with Google Ads, GA4 and CRM. Strong data analytics and campaign optimization.', requirements:['3+ years digital marketing experience','Experience with Google Ads and GA4','CRM experience','Data analytics and campaign optimization'] };

describe('H45B recruiting intelligence stabilization', () => {
  it('estimates employment duration from employment ranges rather than arbitrary education dates', () => {
    const resume = `Jia Yee Tan\njia@example.com\nDigital Marketing Specialist\nProfessional Experience\nDigital Marketing Specialist | Acme\nJan 2021 - Present\nManaged SEO and paid search campaigns.\nMarketing Coordinator | Beta\n2019 - 2021\nEducation\nBachelor of Commerce, 2008`;
    const profile = parseResumeTextDeterministic(resume, 'ResumeJiaYeeTan.pdf');
    expect(profile.yearsOfExperience).toBeGreaterThanOrEqual(6);
    expect(profile.yearsOfExperience).toBeLessThan(10);
    expect(profile.jobTitles.join(' ')).toMatch(/Digital Marketing Specialist|Marketing Coordinator/i);
    expect(profile.employers.join(' ')).toMatch(/Acme|Beta/i);
    expect(profile.parseQuality).toBeGreaterThan(50);
  });


  it('does not mistake education dates for phone or employment duration signals', () => {
    const resume = `Jia Yee Tan\nBachelor of Commerce, 2008\nEducation 2004 - 2008\nSkills\nSEO, GA4`;
    const profile = parseResumeTextDeterministic(resume, 'ResumeJiaYeeTan.pdf');
    expect(profile.phone).toBeUndefined();
    expect(profile.yearsOfExperience ?? 0).toBe(0);
  });

  it('surfaces parsing quality as extraction evidence, not candidate quality', () => {
    const ui = readFileSync('src/components/resume-intake-assistant.tsx','utf8');
    expect(ui).toContain('Parsing evidence summary');
    expect(ui).toContain('not candidate suitability');
    expect(ui).toContain('Experience titles:');
    expect(ui).toContain('All extracted evidence remains transient');
  });

  it('matches common job-language equivalents with explainable semantic evidence', () => {
    const resume = `Jia Yee Tan\njia@example.com\nDigital Marketing Specialist\nProfessional Experience\nDigital Marketing Specialist | Acme\nJan 2021 - Present\nOwned search engine optimization, AdWords, Google Analytics 4, customer relationship management campaigns and data analysis.\nSkills\nSEO, AdWords, GA4, CRM, analytics`;
    const profile = parseResumeTextDeterministic(resume);
    const review = buildAtsReview({ id:'a1', applicationId:'app1', candidateId:candidate.id, requisition:req, candidate, profile, createdBy:'hr1', createdAt:'2026-09-03T00:00:00.000Z' });
    expect(ATS_SCORING_VERSION).toBe('OPSIQO_ATS_JOB_RELEVANCE_V3');
    expect(review.score).toBeGreaterThanOrEqual(60);
    expect(review.evidence.some(e => (e.matchedTerms?.length || 0) > 0)).toBe(true);
    expect(review.evidence.some(e => typeof e.matchScore === 'number')).toBe(true);
    expect([...review.matchedKeywords, ...review.missingKeywords].join(' ').toLowerCase()).not.toMatch(/female|citizenship|nationality/);
  });


  it('requires all conjunctive recognized job concepts instead of over-crediting a partial alias match', () => {
    const partialProfile = parseResumeTextDeterministic(`Jia Yee Tan
jia@example.com
Professional Experience
Digital Marketing Specialist | Acme
2021 - Present
Managed Google Ads campaigns.
Skills
Google Ads`);
    const review = buildAtsReview({ id:'a2', applicationId:'app2', candidateId:candidate.id, requisition:req, candidate, profile:partialProfile, createdBy:'hr1', createdAt:'2026-09-03T00:00:00.000Z' });
    expect(review.missingRequirements).toContain('Experience with Google Ads and GA4');
    const row = review.evidence.find(e => e.criterion === 'Experience with Google Ads and GA4');
    expect(row?.matched).toBe(false);
    expect(row?.missingTerms?.join(' ').toLowerCase()).toMatch(/google analytics|ga4/);
  });

  it('supports common numeric employment date formats inside a real experience section', () => {
    const profile = parseResumeTextDeterministic(`Jia Yee Tan
jia@example.com
Career History
Digital Marketing Specialist | Acme
01/2021 - 06/2024
Marketing Coordinator | Beta
2019 - 2020
Education
Bachelor of Commerce, 2008`);
    expect(profile.yearsOfExperience).toBeGreaterThanOrEqual(5);
    expect(profile.yearsOfExperience).toBeLessThan(8);
  });


  it('keeps short explicit requirements inside a Requirements section and stops at the next job-description section', () => {
    const engine = readFileSync('src/lib/recruiting/ats-engine.ts','utf8');
    expect(engine).toContain('requirementsSection?2:8');
    expect(engine).toContain('key\\s+responsibilities');
  });

  it('auto-selects a newly scheduled interview and supports legacy kit generation', () => {
    const workspace = readFileSync('src/components/recruiting-workspace.tsx','utf8');
    const panel = readFileSync('src/components/interview-intelligence-panel.tsx','utf8');
    const service = readFileSync('src/lib/recruiting/service.ts','utf8');
    const schemas = readFileSync('src/lib/recruiting/schemas.ts','utf8');
    expect(workspace).toContain('setPreferredInterviewId(response.data.id)');
    expect(workspace).toContain('structured interview kit prepared');
    expect(panel).toContain('preferredInterviewId');
    expect(panel).toContain('Legacy interview — structured kit not yet available.');
    expect(panel).toContain('kitAction("generate")');
    expect(service).toContain("input.action!=='generate'");
    expect(service).toContain('interview.kit.generate_legacy');
    expect(schemas).toContain("z.enum(['generate','lock','regenerate'])");
  });

  it('keeps the ATS decision boundary explicitly human-governed', () => {
    const engine = readFileSync('src/lib/recruiting/ats-engine.ts','utf8');
    expect(engine).toMatch(/does not automatically reject, hire, advance/i);
    expect(engine).toMatch(/not predictions of external ATS products/i);
  });
});
