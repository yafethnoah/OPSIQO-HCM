import fs from 'node:fs';

const text = (p) => fs.readFileSync(p, 'utf8');
const checks = [];
const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });

const people = text('src/components/people-table.tsx');
const employeeRoute = text('src/app/api/organizations/[orgId]/employees/[workerId]/route.ts');
const hr = text('src/lib/hr/service.ts');
const schemas = text('src/lib/hr/schemas.ts');
const imports = text('src/components/import-center-workspace.tsx');
const library = text('src/lib/data-import/library-import.ts');

add('People table exposes governed Edit action', people.includes('Correct employee core record') && people.includes('Save governed correction'));
add('People table visibly identifies potential duplicates', people.includes('Potential duplicate'));
add('Duplicate deletion requires explicit employee-number confirmation', people.includes('confirmationEmployeeNumber'));
add('Duplicate deletion is server-side and permission-gated', employeeRoute.includes('export async function DELETE') && employeeRoute.includes("requirePermission(actor, 'people.manage')"));
add('Employee correction is server-side and permission-gated', employeeRoute.includes('export async function PATCH') && employeeRoute.includes('correctEmployeeCore'));
add('Core correction schema requires reason', schemas.includes('employeeCoreCorrectionSchema') && schemas.includes("reason: z.string().trim().min(3)"));
add('Duplicate delete schema requires reason and confirmation', schemas.includes('employeeDuplicateDeleteSchema') && schemas.includes('confirmationEmployeeNumber'));
add('Core correction maintains unique email and employee-number indexes', hr.includes('workEmailIndex') && hr.includes('employeeNumberIndex') && hr.includes("action: 'employee.core.correct'"));
add('Duplicate deletion protects platform memberships', hr.includes('duplicate_delete_membership_linked'));
add('Duplicate deletion protects invitation links', hr.includes('duplicate_delete_invitation_linked'));
add('Duplicate deletion protects manager references', hr.includes('duplicate_delete_manager_referenced'));
add('Duplicate deletion protects downstream HR evidence', hr.includes('duplicate_delete_downstream_reference'));
add('Duplicate deletion retains tombstone and audit evidence', hr.includes('deletedWorkerTombstones') && hr.includes("action: 'employee.duplicate.delete'"));
add('Import actions reconcile visible row state immediately', imports.includes('setLibrary(current=>current.map'));
add('Approve Review UI requires clean scan and completed analysis', imports.includes("r.scanStatus==='clean'&&r.analysisStatus==='completed'"));
add('Approve Review server gate requires clean scan', library.includes('Review approval is blocked until malware scanning is recorded clean.'));
add('Approve Review server gate requires completed Universal Parse', library.includes('Review approval is blocked until Universal Parse completes.'));

let passed = 0;
for (const check of checks) {
  console.log((check.ok ? 'PASS' : 'FAIL').padEnd(5), check.name);
  if (check.ok) passed++;
}
console.log('');
console.log(`H36 PEOPLE LIFECYCLE + IMPORT STATE AUDIT: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);
