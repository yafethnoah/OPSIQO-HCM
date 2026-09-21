import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('H51.66 onboarding pre-activation UX', () => {
  it('surfaces Edit details as a visible case action instead of a hidden accordion', () => {
    const workspace = read('src/components/onboarding-workspace.tsx');

    expect(workspace).toContain("editDetailsOpen?'Close edit':'Edit details'");
    expect(workspace).toContain('aria-expanded={editDetailsOpen}');
    expect(workspace).not.toContain(
      '<details className="notice"><summary><strong>Edit pre-activation details</strong></summary>',
    );
  });

  it('shows the current pre-activation record before the user edits it', () => {
    const workspace = read('src/components/onboarding-workspace.tsx');

    expect(workspace).toContain('Pre-activation details');
    expect(workspace).toContain(
      'Review the worker record that will be created at activation.',
    );
    expect(workspace).toContain('Work email');
    expect(workspace).toContain('Employment type');
    expect(workspace).toContain('Start date');
    expect(workspace).toContain('From accepted offer');
    expect(workspace).toContain('Employee number');
  });

  it('makes the shared-mailbox identity boundary explicit', () => {
    const workspace = read('src/components/onboarding-workspace.tsx');

    expect(workspace).toContain('Shared departmental work email is allowed.');
    expect(workspace).toContain(
      'Work email is contact information, not the worker or login identity.',
    );
  });

  it('requires a real audit reason rather than pre-filling a synthetic reason', () => {
    const workspace = read('src/components/onboarding-workspace.tsx');

    expect(workspace).toContain(
      'placeholder="Explain why this pre-activation information is being changed."',
    );
    expect(workspace).toContain('name="reason"');
    expect(workspace).toContain('minLength={3}');
    expect(workspace).not.toContain(
      'defaultValue="Authorized pre-activation correction"',
    );
  });

  it('keeps accepted-offer start date and employee-number authority read-only in this editor', () => {
    const workspace = read('src/components/onboarding-workspace.tsx');
    const schemas = read('src/lib/onboarding/schemas.ts');

    expect(workspace).toContain(
      'Start date remains governed by the accepted offer.',
    );
    expect(workspace).toContain(
      'Employee number remains unique and is assigned at activation',
    );
    expect(schemas).not.toContain('startDate:z.string');
  });

  it('uses the existing audited update_details service contract', () => {
    const workspace = read('src/components/onboarding-workspace.tsx');
    const service = read('src/lib/onboarding/service.ts');

    expect(workspace).toContain("action:'update_details'");
    expect(service).toContain("action:'onboarding.update_details'");
    expect(service).toContain("'onboarding.details_updated'");
    expect(service).toContain(
      "if(!['in_progress','ready_for_activation'].includes(c.status))",
    );
  });

  it('uses role-aware activation wording for non-employee worker types', () => {
    const workspace = read('src/components/onboarding-workspace.tsx');

    expect(workspace).toContain("'Activate contractor'");
    expect(workspace).toContain("'Activate volunteer'");
    expect(workspace).toContain("'Activate employee'");
  });

  it('closes the editor when switching onboarding cases and after successful save', () => {
    const workspace = read('src/components/onboarding-workspace.tsx');

    expect(workspace).toContain(
      'setEditDetailsOpen(false);setSelected(c.id);await loadDetail(c.id);',
    );
    expect(workspace).toContain(
      "setNotice('Pre-activation details updated.');setEditDetailsOpen(false);",
    );
  });
});