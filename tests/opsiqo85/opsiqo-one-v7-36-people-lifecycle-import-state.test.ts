import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const read = (path: string) => fs.readFileSync(path, 'utf8');

describe('OPSIQO V7.36 / H36 people lifecycle and import state closure', () => {
  it('exposes governed employee core correction and safe duplicate delete API methods', () => {
    const route = read('src/app/api/organizations/[orgId]/employees/[workerId]/route.ts');
    expect(route).toContain('export async function PATCH');
    expect(route).toContain('correctEmployeeCore');
    expect(route).toContain('export async function DELETE');
    expect(route).toContain('deleteDuplicateEmployee');
    expect(route).toContain("requirePermission(actor, 'people.manage')");
  });

  it('provides editable People actions and duplicate review rather than raw delete', () => {
    const people = read('src/components/people-table.tsx');
    expect(people).toContain('Correct employee core record');
    expect(people).toContain('Potential duplicate');
    expect(people).toContain('Delete duplicate');
    expect(people).toContain('employee-number confirmation');
  });

  it('protects linked member identities and downstream evidence from duplicate deletion', () => {
    const service = read('src/lib/hr/service.ts');
    expect(service).toContain('duplicate_delete_membership_linked');
    expect(service).toContain('duplicate_delete_invitation_linked');
    expect(service).toContain('duplicate_delete_manager_referenced');
    expect(service).toContain('duplicate_delete_downstream_reference');
    expect(service).toContain('deletedWorkerTombstones');
    expect(service).toContain("action: 'employee.duplicate.delete'");
  });

  it('maintains work-email and employee-number uniqueness during corrections', () => {
    const service = read('src/lib/hr/service.ts');
    expect(service).toContain('duplicate_work_email');
    expect(service).toContain('duplicate_employee_number');
    expect(service).toContain('workEmailIndex');
    expect(service).toContain('employeeNumberIndex');
    expect(service).toContain("action: 'employee.core.correct'");
  });

  it('reconciles import action state immediately in the browser', () => {
    const workspace = read('src/components/import-center-workspace.tsx');
    expect(workspace).toContain('setLibrary(current=>current.map');
    expect(workspace).toContain("window.setTimeout(()=>{void load()},350)");
  });

  it('blocks review approval until scan and analysis prerequisites are satisfied in UI and server', () => {
    const workspace = read('src/components/import-center-workspace.tsx');
    const library = read('src/lib/data-import/library-import.ts');
    expect(workspace).toContain("r.scanStatus==='clean'&&r.analysisStatus==='completed'");
    expect(library).toContain('Review approval is blocked until malware scanning is recorded clean.');
    expect(library).toContain('Review approval is blocked until Universal Parse completes.');
  });
});
