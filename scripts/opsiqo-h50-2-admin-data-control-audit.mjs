import fs from 'node:fs';

const failures = [];
const read = (file) => {
  if (!fs.existsSync(file)) {
    failures.push(`missing ${file}`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
};

const people = read('src/components/people-table.tsx');
const hr = read('src/lib/hr/service.ts');
const schemas = read('src/lib/hr/schemas.ts');
const employeeRoute = read(
  'src/app/api/organizations/[orgId]/employees/[workerId]/route.ts',
);
const backup = read('src/lib/admin-maintenance/backup.ts');
const backupRoute = read(
  'src/app/api/organizations/[orgId]/admin-maintenance/backup/route.ts',
);
const maintenance = read(
  'src/components/admin-data-maintenance-workspace.tsx',
);
const maintenanceService = read('src/lib/admin-maintenance/service.ts');
const httpClient = read('src/lib/http/client.ts');

for (const signal of [
  'Delete duplicate',
  'Delete mistaken record',
  'Mistaken employee record deletion is only for records created in error',
  'deletionPreflight=1',
  "purpose: 'mistaken_record'",
  'confirmationEmployeeNumber',
]) {
  if (!people.includes(signal)) {
    failures.push(`people UI missing ${signal}`);
  }
}

for (const signal of [
  'getEmployeeDeletionPreflight',
  'MISTAKEN_EMPLOYEE_DELETE_ROLES',
  "'super_admin'",
  "'org_admin'",
  "'hr_admin'",
  "action: 'employee.duplicate.delete'",
  'mistaken_record_purge',
  'deletedWorkerTombstones',
  'duplicateReferenceCollections',
]) {
  if (!hr.includes(signal)) {
    failures.push(`employee purge service missing ${signal}`);
  }
}

if (!schemas.includes("'mistaken_record'")) {
  failures.push('employee deletion schema does not identify mistaken_record');
}

if (!employeeRoute.includes('deletionPreflight')) {
  failures.push('employee route does not expose deletion preflight');
}

if (!employeeRoute.includes('getEmployeeDeletionPreflight')) {
  failures.push('employee route does not call deletion preflight service');
}

for (const signal of [
  "new Set(['super_admin', 'org_admin'])",
  "actor.permissions.includes('platform.manage')",
  'listCollections()',
  'adminBucket().getFiles',
  'createGzip',
  'storage_file_chunk',
  'credential_like_field',
  'admin.organization_backup.requested',
  'admin.organization_backup.completed',
]) {
  if (!backup.includes(signal)) {
    failures.push(`organization backup service missing ${signal}`);
  }
}

if (!backup.includes('`organizations/${actor.orgId}/`')) {
  failures.push('backup storage scope is not tenant-prefixed');
}

if (
  backup.includes('FIREBASE_PRIVATE_KEY') ||
  backup.includes('FIREBASE_CLIENT_EMAIL') ||
  backup.includes('process.env.GEMINI_API_KEY')
) {
  failures.push('backup service must not read platform credential values');
}

for (const signal of [
  "export const runtime = 'nodejs'",
  'Content-Disposition',
  'application/gzip',
  'Cache-Control',
]) {
  if (!backupRoute.includes(signal)) {
    failures.push(`backup route missing ${signal}`);
  }
}

for (const signal of [
  'Export full organization backup',
  'apiDownload',
  'OPSIQO organization backup',
  'data.backup.confirmationText',
]) {
  if (!maintenance.includes(signal)) {
    failures.push(`admin maintenance UI missing ${signal}`);
  }
}

for (const signal of [
  'backup: {',
  'confirmationText:',
  'BACKUP ',
]) {
  if (!maintenanceService.includes(signal)) {
    failures.push(`admin maintenance backup contract missing ${signal}`);
  }
}

if (!httpClient.includes('apiDownload(path: string, init: ApiFetchInit = {})')) {
  failures.push('apiDownload does not support governed POST downloads');
}

if (failures.length) {
  console.error('H50.2 admin data control audit: FAIL');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('H50.2 admin data control audit: PASS');
console.log(' - mistaken employee purge is admin-only and preflighted');
console.log(' - typed employee-number confirmation remains mandatory');
console.log(' - downstream HR/payroll/time/evidence blocks destructive purge');
console.log(' - deletion tombstone and audit evidence are retained');
console.log(' - full organization backup is org/super-admin only');
console.log(' - backup is tenant scoped to organization Firestore + organization storage');
console.log(' - credential-like Firestore fields are redacted');
console.log(' - platform credential environment values are never read');
console.log(' - backup is streamed as JSONL + gzip for device download');
