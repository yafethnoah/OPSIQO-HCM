import fs from 'node:fs';

const requiredFiles=[
  'src/components/platform-tenant-workspace.tsx',
  'src/lib/platform/tenant-management.ts',
  'src/app/api/platform/tenants/[orgId]/route.ts',
  'src/lib/auth/session.ts',
];

for(const file of requiredFiles){
  if(!fs.existsSync(file))throw new Error(`H51.81 missing ${file}`);
}

const ui=fs.readFileSync(requiredFiles[0],'utf8');
const service=fs.readFileSync(requiredFiles[1],'utf8');
const route=fs.readFileSync(requiredFiles[2],'utf8');
const auth=fs.readFileSync(requiredFiles[3],'utf8');

for(const marker of [
  'Deactivate',
  'Reactivate',
  'Permanently delete',
  'Type the exact organization name to confirm',
  'DELETE PRODUCTION',
  'PlatformTenantDeletionInspection',
  'OpsiqoSelect ariaLabel="Environment"',
]){
  if(!ui.includes(marker))throw new Error(`H51.81 UI marker missing: ${marker}`);
}

for(const marker of [
  'protectCurrentOrganization',
  "target.status!=='inactive'",
  "input.organizationName!==target.name",
  "input.productionConfirmation!=='DELETE PRODUCTION'",
  'dependencySummary(targetOrgId)',
  'db.recursiveDelete(target.ref)',
  "_platformTenantLifecycle/",
  "_platformOrganizationNames/",
  "authenticationUsers:'preserved'",
]){
  if(!service.includes(marker))throw new Error(`H51.81 service marker missing: ${marker}`);
}

for(const marker of ['export async function GET','export async function PATCH','export async function DELETE']){
  if(!route.includes(marker))throw new Error(`H51.81 API marker missing: ${marker}`);
}

if(!auth.includes('organization_inactive'))throw new Error('Inactive-organization access guard missing.');
if(/<select\b/.test(ui))throw new Error('Native select returned to Platform Companies.');

console.log('OPSIQO H51.81 GOVERNED ORGANIZATION LIFECYCLE AUDIT: PASS');
