import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { WORKFLOW_TRIGGER_VALUES } from '@/domain/workflow';

const read = (path: string) => readFileSync(path, 'utf8');

describe('H47.1A mobile workspace and certification repair', () => {
  it('keeps root and mobile TypeScript workspaces isolated', () => {
    const rootTsconfig = JSON.parse(read('tsconfig.json')) as { exclude?: string[] };
    const mobileTsconfig = JSON.parse(read('mobile/tsconfig.json')) as { compilerOptions?: { paths?: Record<string, string[]> } };
    expect(rootTsconfig.exclude).toContain('mobile');
    expect(mobileTsconfig.compilerOptions?.paths?.['@/*']).toEqual(['./src/*']);
  });

  it('keeps H46 shift and expense domain events in the authoritative workflow trigger catalog', () => {
    for (const trigger of [
      'time.shift.published',
      'time.shift.cancelled',
      'expense.submitted',
      'expense.manager_approved',
      'expense.finance_approved',
      'expense.rejected',
      'expense.paid',
      'expense.cancelled',
    ] as const) {
      expect(WORKFLOW_TRIGGER_VALUES).toContain(trigger);
    }
  });

  it('maps expense actions to stable past-tense domain event names', () => {
    const service = read('src/lib/time/frontline-service.ts');
    expect(service).toContain("submit: 'expense.submitted'");
    expect(service).toContain("manager_approve: 'expense.manager_approved'");
    expect(service).toContain("finance_approve: 'expense.finance_approved'");
    expect(service).toContain("reject: 'expense.rejected'");
    expect(service).toContain("mark_paid: 'expense.paid'");
    expect(service).toContain("cancel: 'expense.cancelled'");
    expect(service).toContain("buildDomainEvent(actor,eventType,'expenseClaim'");
  });

  it('declares mobile UI styles before exporting the style object', () => {
    const ui = read('mobile/src/components/ui.tsx');
    expect(ui.indexOf('const styles=StyleSheet.create')).toBeGreaterThan(-1);
    expect(ui.indexOf('export const uiStyles=styles')).toBeGreaterThan(ui.indexOf('const styles=StyleSheet.create'));
    expect(ui).not.toContain("fontWeight:'750'");
  });

  it('uses a non-mutating mobile dependency compatibility check during certification', () => {
    const runner = read('RUN_OPSIQO_H47_1A_VALIDATION.ps1');
    expect(runner).toContain('npx expo install --check');
    expect(runner).not.toContain('npx expo install --fix');
    expect(runner).toContain('npm install --no-package-lock');
  });
});
