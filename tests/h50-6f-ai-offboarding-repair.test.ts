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

  it('does not render Start for an in-progress offboarding task',()=>{
    const workspace=read('src/components/separation-workspace.tsx');
    expect(workspace).toContain("['pending','overdue'].includes(t.status)");
    expect(workspace).toContain("['pending','overdue','in_progress'].includes(t.status)");
  });

  it('enforces server-side task transitions and idempotent repeated actions',()=>{
    const service=read('src/lib/separation/service.ts');
    expect(service).toContain("input.action==='start'&&current==='in_progress'");
    expect(service).toContain("input.action==='complete'&&current==='completed'");
    expect(service).toContain("input.action==='waive'&&current==='waived'");
    expect(service).toContain("'invalid_task_status'");
  });
});
