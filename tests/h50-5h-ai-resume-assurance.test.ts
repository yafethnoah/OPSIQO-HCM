import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {applyResumeAssurance} from '../src/lib/recruiting/resume-assurance';
const read=(p:string)=>fs.readFileSync(p,'utf8');

describe('OPSIQO H50.5H AI resume parsing assurance',()=>{
 it('rejects generic HR identity and recruiting mailbox contamination',()=>{
  const p=applyResumeAssurance({firstName:'HR',lastName:'Department',displayName:'HR Department',email:'hr@krisatelier.ca',phone:'6476431150',skills:[],certifications:[],education:[],employers:[],jobTitles:[],sourceText:'SHADI ALKTAIFAN HR Department hr@krisatelier.ca',warnings:[],parser:'hybrid',parseQuality:85,parseTrust:91,aiVerified:true},{fileName:'Shadi_Alktaifan_Resume.docx',sourceText:'SHADI ALKTAIFAN HR Department hr@krisatelier.ca',aiUsed:true});
  expect(p.firstName).toBe('Shadi');expect(p.lastName).toBe('Alktaifan');expect(p.email).toBeUndefined();expect(p.parseTrust).toBeLessThan(80);expect(p.unresolvedFields).toContain('email');
 });
 it('uses a two-pass governed AI parser that explicitly separates candidate from recruiter contacts',()=>{
  const p=read('src/lib/recruiting/ats-provider.ts');
  expect(p).toContain('PASS 1 - candidate-focused resume extraction');
  expect(p).toContain('PASS 2 - independently verify and correct');
  expect(p).toContain('Never use a hiring manager, recruiter, HR department');
  expect(p).toContain('overallTrust');
  const supportedResumeParserVersion =
    p.includes("RECRUITING_RESUME_PARSE_V5_SEMANTIC_RECONSTRUCTION") ||
    p.includes("RECRUITING_RESUME_PARSE_V6_RECORD_INTEGRITY") ||
    p.includes("RECRUITING_RESUME_PARSE_V7_ADVANCED_DOCUMENT_INTELLIGENCE");
  expect(supportedResumeParserVersion).toBe(true);
  expect(p).toContain('PASS 3 - semantic reconstruction and completeness repair');
 });
 it('never labels machine parsing as 100 percent certain and requires candidate verification',()=>{
  const p=read('src/components/candidate-application-portal.tsx');
  expect(p).toContain('Machine parsing is never represented as 100% certain');
  expect(p).toContain('I reviewed every parsed resume section');
  expect(p).toContain('100% candidate-verified');
  expect(p).toContain('Machine parse trust');
 });
 it('keeps candidate reviewed edits separate from ATS source evidence',()=>{
  const fit=read('src/lib/recruiting/candidate-fit-service.ts');
  const portal=read('src/components/candidate-application-portal.tsx');
  expect(fit).toContain('candidate.resumeText');
  expect(portal).toContain('internal Fit % remains grounded in the original uploaded resume evidence');
 });
});
