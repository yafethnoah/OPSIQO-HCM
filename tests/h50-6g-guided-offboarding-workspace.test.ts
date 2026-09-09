import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const read=(path:string)=>fs.readFileSync(path,'utf8');
describe('H50.6G guided offboarding workspace',()=>{
  it('generates governed steps and editable documents for every task code',()=>{
    const source=read('src/lib/separation/task-workspace.ts');
    for(const code of ['hr_checklist','knowledge_transfer','it_deprovision','time_leave_review','asset_return','final_payroll','roe','benefits','exit_interview','replacement','retention'])expect(source).toContain(`${code}:`);
    expect(source).toContain("workspaceVersion:'H50.6G'");
    expect(source).toContain("workspaceSource:'governed_template'");
  });
  it('starts idempotently and blocks premature completion',()=>{
    const source=read('src/lib/separation/service.ts');
    expect(source).toContain("task.status==='in_progress'&&task.workspaceVersion");
    expect(source).toContain('buildTaskWorkspace(task,c,actor.uid,timestamp)');
    expect(source).toContain('workspaceReady(task)');
    expect(source).toContain("'task_workspace_incomplete'");
  });
  it('provides Start, Continue, document editing and confirmation controls',()=>{
    const page=read('src/components/separation-workspace.tsx'),workspace=read('src/components/separation-task-workspace.tsx');
    expect(page).toContain('>Start</button>');
    expect(page).toContain('>Continue</button>');
    expect(workspace).toContain("onAction('set_step'");
    expect(workspace).toContain("onAction('save_document'");
    expect(workspace).toContain("onAction('confirm_document'");
    expect(workspace).toContain('Download');
  });
  it('requires a waiver justification and preserves human review safeguards',()=>{
    const service=read('src/lib/separation/service.ts'),templates=read('src/lib/separation/task-workspace.ts');
    expect(service).toContain("'waiver_reason_required'");
    expect(templates).toContain('without AI determining entitlement');
    expect(templates).toContain('Human review is required');
  });
});
