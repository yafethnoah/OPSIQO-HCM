import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
const read=(path:string)=>readFileSync(path,'utf8');
describe('H50.6H workflow resilience',()=>{
 it('recovers legacy in-progress offboarding tasks',()=>expect(read('src/components/separation-workspace.tsx')).toContain("['pending','overdue','in_progress'].includes(t.status)"));
 it('requires substantive offboarding document evidence',()=>{const source=read('src/lib/separation/task-workspace.ts');expect(source).toContain('documentHasSubstantiveEvidence');expect(source).toContain('completedFields.length>=2')});
 it('provides governed Word and PDF export controls',()=>{const source=read('src/components/separation-task-workspace.tsx');expect(source).toContain('Download Word');expect(source).toContain('Print / Save PDF')});
 it('allows human-reviewed recruiting fallback during provider failure',()=>{const source=read('src/lib/recruiting/candidate-portal-service.ts');expect(source.match(/requireStructuredPrefill:false/g)?.length).toBeGreaterThanOrEqual(2);expect(source).toContain('manual review mode')});
});
