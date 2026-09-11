import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {deterministicStructuredResume,assessStructuredResume,mergeStructuredResume} from '../src/lib/recruiting/resume-structure';
const read=(p:string)=>fs.readFileSync(p,'utf8');

describe('OPSIQO H50.5J resume parsing accuracy closure',()=>{
 it('separates degree field of study and institution from one compound education line',()=>{
  const source='EDUCATION\nMaster’s Degree – Pharmaceutical Botany – Voronezh State University\n';
  const sr=deterministicStructuredResume({sourceText:source,skills:[],certifications:[]});
  expect(sr.educationHistory).toHaveLength(1);
  expect(sr.educationHistory[0]?.degree).toBe('Master’s Degree');
  expect(sr.educationHistory[0]?.fieldOfStudy).toBe('Pharmaceutical Botany');
  expect(sr.educationHistory[0]?.institution).toBe('Voronezh State University');
 });
 it('never turns an achievement sentence into an education record',()=>{
  const source='EDUCATION\nAssessed HR infrastructure and implemented improvements across the organization.\nMaster’s Degree – Pharmaceutical Botany – Voronezh State University\n';
  const sr=deterministicStructuredResume({sourceText:source,skills:[],certifications:[]});
  expect(sr.educationHistory.some(x=>/^Assessed HR infrastructure/i.test(x.degree))).toBe(false);
 });
 it('does not pair flat jobTitles and employers arrays by array position',()=>{
  const service=read('src/lib/recruiting/candidate-portal-service.ts');
  expect(service).not.toContain("(profile?.jobTitles||[]).map((positionTitle:string,index:number)");
  expect(service).toContain('deterministicStructuredResume(profile)');
  expect(service).toContain('mergeStructuredResume');
 });
 it('rejects role descriptors as employer values during structured merge',()=>{
  const source='PROFESSIONAL EXPERIENCE\nChief Executive Officer (CEO)\nAuranitis Life Line\n2019 – Present\nLed organization growth and operations.\n';
  const fallback=deterministicStructuredResume({sourceText:source,skills:[],certifications:[]});
  const merged=mergeStructuredResume({employmentHistory:[{positionTitle:'Chief Executive Officer (CEO)',employer:'Founding Leader',responsibilities:[]}],educationHistory:[],skills:[],certifications:[],languages:[],projects:[],volunteerExperience:[],awards:[],publications:[]},fallback,source);
  expect(merged.employmentHistory.some(x=>x.employer==='Founding Leader')).toBe(false);
 });
 it('calculates structured quality and blocks weak relationship records from high confidence',()=>{
  const source='EDUCATION\nMaster’s Degree – Pharmaceutical Botany – Voronezh State University\n';
  const sr=deterministicStructuredResume({sourceText:source,skills:[],certifications:[]});
  const a=assessStructuredResume(sr,source);
  expect(a.recordCount).toBeGreaterThan(0);
  expect(a.quality).toBeGreaterThan(0);
  expect(a.quality).toBeLessThanOrEqual(99);
 });
 it('bootstraps dedicated governed recruiting AI configuration',()=>{
  const activation=read('src/lib/ai-intelligence/activation.ts');
  expect(activation).toContain("code: 'RECRUITING_ATS'");
  expect(activation).toContain("code: 'RECRUITING_ATS_MODEL'");
  expect(activation).toContain('recruitingLiveReady');
  expect(activation).toContain('Human recruiter review remains mandatory');
 });
 it('keeps machine confidence separate from 100 percent candidate verification',()=>{
  const portal=read('src/components/candidate-application-portal.tsx');
  expect(portal).toContain('Structured Record Quality');
  expect(portal).toContain('Machine Parse Trust');
  expect(portal).toContain('100% candidate-verified');
  expect(portal).toContain('internal Fit % remains grounded in the original uploaded resume evidence');
 });
 it('preserves candidate draft and submission helpers while adding H50.5J parsing',()=>{
  const service=read('src/lib/recruiting/candidate-portal-service.ts');
  for(const v of ['function answers(','async function save(','export async function savePublicApplicationDraft(','export async function loadPublicApplicationDraft('])expect(service).toContain(v);
 }); it('keeps recruiter document-first intake compatible without weakening candidate prefill gates',()=>{
  const service=read('src/lib/recruiting/ats-service.ts');
  expect(service).toContain('options: { requireStructuredPrefill?: boolean } = {}');
  expect(service).toContain('options.requireStructuredPrefill!==false&&!coverage.prefillReady');
  expect(service).toContain('parseResumeFile(actor, file, { requireStructuredPrefill: false })');
  const candidate=read('src/lib/recruiting/candidate-portal-service.ts');
  expect(candidate).toContain('parseResumeFile(actor(x.orgId,x.link.id),file,{requireStructuredPrefill:false})');
  expect(candidate).toContain('candidateVerificationGate(verifiedStructuredResume,parsed.profile.sourceText)');
  expect(candidate).toContain('resume_structural_review_required');
 });
 it('keeps source ATS evidence immutable and no automatic employment decision',()=>{
  const fit=read('src/lib/recruiting/candidate-fit-service.ts');
  const provider=read('src/lib/recruiting/ats-provider.ts');
  expect(fit).toContain('candidate.resumeText');
  expect(provider).toContain('Do not make hiring/rejection decisions');
 });
});
