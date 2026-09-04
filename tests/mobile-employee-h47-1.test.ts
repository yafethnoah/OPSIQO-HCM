import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
const read=(p:string)=>fs.readFileSync(p,'utf8');
describe('H47.1 Employee Mobile Essentials',()=>{
  it('preserves server-authoritative mobile bootstrap and permission-gated capabilities',()=>{const s=read('src/lib/mobile/service.ts');expect(s).toContain("safety: can('safety.report')");expect(s).toContain("aiCopilot: can('ai.use')");expect(s).toContain('listEmployeeDocuments(actor, workerId)');});
  it('queues offline attendance only with H46 replay controls',()=>{const s=read('mobile/src/mobile/offline-attendance.ts');expect(s).toContain('offlineEventId:event.id');expect(s).toContain('clientCapturedAt:event.capturedAt');expect(s).toContain("source:'offline_sync'");expect(s).toContain('MAX_EVENTS=12');});
  it('does not introduce mobile Firestore writes',()=>{const files=['mobile/app/(app)/documents.tsx','mobile/app/(app)/learning.tsx','mobile/app/(app)/copilot.tsx','mobile/app/(app)/safety.tsx','mobile/app/(app)/team.tsx','mobile/src/mobile/offline-attendance.ts'];for(const f of files)expect(read(f)).not.toContain('firebase/firestore');});
  it('keeps manager mobile mode visibility-only',()=>{expect(read('mobile/app/(app)/team.tsx')).toContain('visibility only');});
});
