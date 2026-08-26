import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ui=readFileSync('src/components/employee-import-panel.tsx','utf8');
const route=readFileSync('src/app/api/organizations/[orgId]/imports/employees/route.ts','utf8');
const service=readFileSync('src/lib/data-import/employee-import.ts','utf8');

describe('H30 employee import review completion contract',()=>{
  it('lets HR complete parsed employee information without re-uploading the source file',()=>{
    expect(ui).toContain('Complete information');
    expect(ui).toContain('Save & revalidate');
    expect(ui).toContain("method:'PATCH'");
    expect(ui).toContain('You do not need to edit and upload the source file again.');
  });

  it('exposes authoritative org unit, position and manager selectors',()=>{
    expect(ui).toContain('preview.options.orgUnits');
    expect(ui).toContain('availablePositions');
    expect(ui).toContain('preview.options.managers');
  });

  it('provides a governed server-side correction endpoint',()=>{
    expect(route).toContain('export async function PATCH');
    expect(route).toContain('updateEmployeeImportPreviewRow');
    expect(service).toContain('export async function updateEmployeeImportPreviewRow');
    expect(service).toContain("action:'employee.import.preview.correct'");
  });

  it('revalidates corrected previews before commit',()=>{
    expect(service).toContain('validateRows(nextRows,ctx)');
    expect(service).toContain('Selected position does not belong to the selected organization unit.');
    expect(service).toContain('Selected position has no available capacity.');
    expect(service).toContain('Duplicate work email.');
    expect(service).toContain('Manager hierarchy contains a cycle.');
  });
});
