import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(path, 'utf8');

describe('H39 form safety and offboarding discoverability', () => {
  it('does not dereference React currentTarget after asynchronous form actions', () => {
    for (const path of [
      'src/components/organization-panel.tsx',
      'src/components/recruiting-workspace.tsx',
      'src/components/separation-workspace.tsx',
    ]) {
      expect(source(path)).not.toContain('e.currentTarget.reset()');
    }
  });

  it('keeps bootstrap requests outside tenant context', () => {
    const setup = source('src/app/setup/page.tsx');
    expect(setup).toMatch(/api\/me\/organizations'[\s\S]{0,120}orgContext:\s*'omit'/);
    expect(setup).toMatch(/api\/setup'[\s\S]{0,260}orgContext:\s*'omit'/);
  });

  it('surfaces the existing offboarding workspace beside onboarding', () => {
    const nav = source('src/components/nav.tsx');
    expect(nav).toContain("label:'Offboarding',href:'/separations'");
    expect(nav).toMatch(/label:'Offboarding'[\s\S]{0,180}area:'work'/);
  });
});
