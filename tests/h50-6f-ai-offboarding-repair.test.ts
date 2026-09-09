import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const read=(path:string)=>fs.readFileSync(path,'utf8');

describe('H50.6F AI and offboarding repair',()=>{
  it('retries Gemini without the complex schema only after a schema HTTP 400',()=>{
    const provider=read('src/lib/ai-intelligence/provider.ts');
    expect(provider).toContain("r.status===400");
    expect(provider).toContain("request({responseMimeType:'application/json'})");
    expect(provider).toContain('parseAnswer(text)');
    expect(provider).toContain('OPSIQO_AI_SCHEMA_FALLBACK');
  });

  it('logs only bounded sanitized Gemini failure diagnostics',()=>{
    const provider=read('src/lib/ai-intelligence/provider.ts');
    expect(provider).toContain('OPSIQO_AI_PROVIDER_FAILURE');
    expect(provider).toContain('[REDACTED_GOOGLE_KEY]');
    expect(provider).toContain('.slice(0,500)');
    expect(provider).not.toContain('console.error(key');
    expect(provider).not.toContain('console.error(req');
  });

  it('keeps the Start transition scoped to pending or overdue tasks',()=>{
    const workspace=read('src/components/separation-workspace.tsx');
    expect(workspace).toContain("['pending','overdue'].includes(t.status)");
    expect(workspace).toContain("['in_progress','overdue'].includes(t.status)");
  });

  it('enforces server-side task transitions and idempotent repeated actions',()=>{
    const service=read('src/lib/separation/service.ts');
    expect(service).toContain("task.status==='in_progress'&&task.workspaceVersion");
    expect(service).toContain("task.status==='completed'");
    expect(service).toContain("task.status==='waived'");
    expect(service).toContain("'invalid_task_status'");
  });
});
