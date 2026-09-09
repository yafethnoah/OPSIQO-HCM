import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const read=(path:string)=>fs.readFileSync(path,'utf8');

describe('H50.6I intelligent HR operations',()=>{
  it('generates real fillable PDF forms without a new runtime dependency',()=>{
    const pdf=read('src/lib/documents/fillable-pdf.ts');
    const workspace=read('src/components/separation-task-workspace.tsx');
    expect(pdf).toContain('/AcroForm');
    expect(pdf).toContain('/FT /Tx');
    expect(pdf).toContain('/NeedAppearances true');
    expect(workspace).toContain('Download fillable PDF');
    expect(workspace).toContain('buildFillablePdf');
  });

  it('expands offboarding into detailed execution workspaces and clearance forms',()=>{
    const page=read('src/components/separation-workspace.tsx');
    const templates=read('src/lib/separation/task-workspace.ts');
    expect(page).toContain('Offboarding execution plan');
    expect(page).toContain('Prepare all task workspaces');
    expect(page).toContain('Completion criteria:');
    for(const form of ['Final HR clearance and sign-off','Post-employment confidentiality reminder','Manager offboarding clearance','IT access and device clearance','Property and facilities clearance'])expect(templates).toContain(form);
    expect(templates).toContain('without AI determining entitlement');
  });

  it('shows field-level parsing trust, evidence and governed AI improvement',()=>{
    const source=read('src/components/import-center-workspace.tsx');
    expect(source).toContain('Improve with AI / re-parse');
    expect(source).toContain('Source evidence');
    expect(source).toContain('high_confidence');
    expect(source).toContain('review_required');
    expect(source).toContain('unsupported “100% parsing accuracy” claim');
  });

  it('adds HR Today and universal next-action integration hooks',()=>{
    const today=read('src/components/hr-today-actions.tsx');
    const daily=read('src/components/daily-brief-workspace.tsx');
    const assist=read('src/lib/ai-intelligence/section-assist.ts');
    expect(today).toContain('HR TODAY · INTELLIGENT COMMAND CENTRE');
    expect(today).toContain('Bulk execution safeguard');
    expect(daily).toContain('<HrTodayActions');
    expect(assist).toContain('NEXT_ACTION_PRESET');
    expect(assist).toContain('What should I do next?');
  });

  it('keeps release and consequential-action controls explicit',()=>{
    const identity=read('src/lib/release/identity.ts');
    const today=read('src/components/hr-today-actions.tsx');
    expect(identity).toContain("'H50.6I'");
    expect(today).toContain('does not bulk-approve hiring, termination, discipline, compensation, accommodation');
  });
});
