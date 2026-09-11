import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
const read=(path:string)=>readFileSync(path,'utf8');
describe('H50.6H workflow resilience',()=>{
 it('recovers legacy in-progress offboarding tasks',()=>expect(read('src/components/separation-workspace.tsx')).toContain("['pending','overdue','in_progress'].includes(t.status)"));
 it('requires substantive offboarding document evidence',()=>{const source=read('src/lib/separation/task-workspace.ts');expect(source).toContain('documentHasSubstantiveEvidence');expect(source).toContain('completedFields.length>=2')});
 it('provides governed Word and PDF export controls',()=>{const source=read('src/components/separation-task-workspace.tsx');expect(source).toContain('Download Word');expect(source).toContain('Print / Save PDF')});
 it('keeps governed human-review fallback while public candidate parsing stays fail-closed',()=>{
  const source=read('src/lib/recruiting/candidate-portal-service.ts');
  const ats=read('src/lib/recruiting/ats-service.ts');
  const start=source.indexOf('export async function parsePublicCandidateResume');
  const end=source.indexOf('export async function',start+20);
  const publicParseBlock=source.slice(start,end>start?end:undefined);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(publicParseBlock).toContain('parseResumeFile(actor(x.orgId,x.link.id),file)');
  expect(publicParseBlock).not.toContain('humanReviewFallback');
  expect(publicParseBlock).not.toContain('requireStructuredPrefill:false');

  expect(source.match(/requireStructuredPrefill:false/g)?.length).toBeGreaterThanOrEqual(1);
  expect(source).toContain('manual review mode');
  expect(ats).toContain('parseResumeFile(actor, file, { requireStructuredPrefill: false })');
 });
});
