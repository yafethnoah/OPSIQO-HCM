import fs from 'node:fs';
import {describe,expect,it} from 'vitest';
import {assessStructuredResume,sanitizeStructuredResume} from '../src/lib/recruiting/resume-structure';

const base=()=>({employmentHistory:[],educationHistory:[],skills:[],certifications:[],languages:[],projects:[],volunteerExperience:[],awards:[],publications:[],additionalInformation:''});
const source=[
'EDUCATION & CREDENTIALS',
'PhD','St. Clements University','2006 - 2010',
"Master's Degree",'Voronezh State University','2001 - 2003',
"Bachelor's Degree",'Voronezh State University','1995 - 2000',
'Postgraduate Certificate','Human Resources Management','Loyalist College','Ontario','in progress','expected','August 2026'
].join('\n');

describe('OPSIQO H51.34 record-bound education provenance',()=>{
 it('assigns August 2026 only to Loyalist',()=>{
  const safe=sanitizeStructuredResume({...base(),educationHistory:[
   {degree:'PhD',institution:'St. Clements University',graduationDate:'August 2026'},
   {degree:"Master's Degree",institution:'Voronezh State University',graduationDate:'August 2026'},
   {degree:"Bachelor's Degree",institution:'Voronezh State University',graduationDate:'August 2026'},
   {degree:'Postgraduate Certificate',fieldOfStudy:'Human Resources Management',institution:'Loyalist College',location:'Ontario'}
  ]},source);
  expect(safe.educationHistory[0]?.graduationDate).toBeUndefined();
  expect(safe.educationHistory[1]?.graduationDate).toBeUndefined();
  expect(safe.educationHistory[2]?.graduationDate).toBeUndefined();
  expect(safe.educationHistory[3]?.graduationDate).toBe('August 2026');
  expect(safe.educationHistory[3]?.completed).toBe(false);
 });

 it('flags foreign graduation dates before sanitization',()=>{
  const a=assessStructuredResume({...base(),educationHistory:[
   {degree:'PhD',institution:'St. Clements University',graduationDate:'August 2026'},
   {degree:"Master's Degree",institution:'Voronezh State University',graduationDate:'August 2026'},
   {degree:'Postgraduate Certificate',institution:'Loyalist College',graduationDate:'August 2026',completed:false}
  ]},source);
  const c=a.criticalIssues.join(' ');
  expect(c).toMatch(/Education 1: graduation date August 2026 is not supported by this education record's local evidence block/i);
  expect(c).toMatch(/Education 2: graduation date August 2026 is not supported by this education record's local evidence block/i);
 });

 it('does not use section fallback for an unanchored education record',()=>{
  const safe=sanitizeStructuredResume({...base(),educationHistory:[{degree:'Unknown Executive Program',institution:'Unknown School',graduationDate:'August 2026'}]},source);
  expect(safe.educationHistory).toHaveLength(0);
 });

 it('keeps independent dates on their own records',()=>{
  const s=['EDUCATION','Master of Science','Alpha University','June 2012','Postgraduate Certificate','Beta College','expected August 2026'].join('\n');
  const safe=sanitizeStructuredResume({...base(),educationHistory:[
   {degree:'Master of Science',institution:'Alpha University',graduationDate:'June 2012'},
   {degree:'Postgraduate Certificate',institution:'Beta College',graduationDate:'August 2026'}
  ]},s);
  expect(safe.educationHistory[0]?.graduationDate).toBe('June 2012');
  expect(safe.educationHistory[1]?.graduationDate).toBe('August 2026');
 });

 it('preserves certification completeness blocking',()=>{
  const a=assessStructuredResume(base(),['PROFESSIONAL DEVELOPMENT','Microsoft Certified: Azure AI Fundamentals'].join('\n'));
  expect(a.criticalIssues.join(' ')).toMatch(/source-supported certification evidence.*no structured certification records/i);
 });

 it('preserves precise Current semantics',()=>{
  const s=['PROFESSIONAL EXPERIENCE','HR Practicum','Example Foundation','2026','Supported current policy modernization priorities.'].join('\n');
  const safe=sanitizeStructuredResume({...base(),employmentHistory:[{positionTitle:'HR Practicum',employer:'Example Foundation',startDate:'2026',current:true,responsibilities:['Supported current policy modernization priorities.']}]},s);
  expect(safe.employmentHistory[0]?.current).toBe(false);
 });

 it('exposes V15 provenance and record-bound readiness',()=>{
  const provider=fs.readFileSync('src/lib/recruiting/ats-provider.ts','utf8');
  const ui=fs.readFileSync('src/components/candidate-application-portal.tsx','utf8');
  expect(provider).toContain('RECRUITING_RESUME_PARSE_V15_RECORD_BOUND_EDUCATION_PROVENANCE');
  expect(provider).toContain('RECORD-BOUND EDUCATION PROVENANCE');
  expect(ui).toContain('Record-bound semantic and source-completeness readiness checks passed for the records currently shown.');
 });

 it('preserves final verification and Fit evidence authority',()=>{
  const service=fs.readFileSync('src/lib/recruiting/candidate-portal-service.ts','utf8');
  const ui=fs.readFileSync('src/components/candidate-application-portal.tsx','utf8');
  expect(service).toContain('candidateEnteredVerification');
  expect(service).toContain('candidateVerificationGate(verifiedStructuredResume,parsed.profile.sourceText)');
  expect(service).toContain('!verification.canFinalize');
  expect(ui).toContain('internal Fit % remains grounded in the original uploaded resume evidence');
 });
});
