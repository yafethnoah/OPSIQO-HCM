import { readFileSync } from 'node:fs';

const bootstrap = readFileSync('src/lib/organization/bootstrap.ts', 'utf8');
const dev = readFileSync('scripts/dev-frontend-local.mjs', 'utf8');
const setup = readFileSync('src/app/setup/page.tsx', 'utf8');

const checks = [
  ['emulator host required', bootstrap.includes('FIREBASE_AUTH_EMULATOR_HOST')],
  ['explicit local flag required', bootstrap.includes("OPSIQO_LOCAL_FIRST_USER_BOOTSTRAP === 'true'")],
  ['production email remains required', bootstrap.includes('OPSIQO_BOOTSTRAP_ADMIN_EMAIL must be configured')],
  ['production email mismatch remains blocked', bootstrap.includes('bootstrap_identity_not_authorized')],
  ['local identity must still have email', bootstrap.includes('bootstrap_email_required')],
  ['one-time org claim remains', bootstrap.includes('_system/firstOrganizationBootstrap')],
  ['existing org still blocks', bootstrap.includes('organization_exists')],
  ['local launcher enables local first-user claim', dev.includes("OPSIQO_LOCAL_FIRST_USER_BOOTSTRAP: process.env.OPSIQO_LOCAL_FIRST_USER_BOOTSTRAP || 'true'")],
  ['setup uses authenticated administrator wording', setup.includes('Authenticated administrator')],
  ['setup explains local-vs-production behavior', setup.includes('Local emulator mode allows the first authenticated identity')],
];
let failures = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failures++;
}
if (failures) process.exit(1);
console.log(`PASS  local bootstrap regression ${checks.length}/${checks.length}`);
