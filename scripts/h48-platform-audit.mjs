#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve('.');
const failures = [];
const passes = [];

function file(rel) {
  const abs = resolve(root, rel);
  if (!existsSync(abs)) {
    failures.push(`Missing file: ${rel}`);
    return '';
  }
  passes.push(`Present: ${rel}`);
  return readFileSync(abs, 'utf8');
}

function expectText(rel, source, pattern, label) {
  if (!pattern.test(source)) failures.push(`${label} (${rel})`);
  else passes.push(label);
}

const service = file('src/lib/membership/service.ts');
const access = file('src/lib/membership/account-access.ts');
const email = file('src/lib/membership/invitation-email.ts');
const org = file('src/lib/organization/service.ts');
const signin = file('src/app/signin/page.tsx');
const profile = file('src/components/employee-profile.tsx');
const panel = file('src/components/invitation-panel.tsx');
const download = file('src/app/download-app/page.tsx');
const route = file('src/app/api/organizations/[orgId]/employees/[workerId]/access/route.ts');
const security = file('src/domain/security.ts');
const env = file('.env.example');

expectText('src/lib/membership/account-access.ts', access, /getUserByEmail\(email\)/, 'Firebase identity reuse is implemented');
expectText('src/lib/membership/account-access.ts', access, /createUser\(\{\s*email,/s, 'Firebase identity creation is implemented');
expectText('src/lib/membership/account-access.ts', access, /generatePasswordResetLink/, 'Firebase password-setup link is generated server-side');
expectText('src/lib/membership/service.ts', service, /provisionInvitationAccess/, 'Invitation provisioning service is present');
expectText('src/lib/membership/service.ts', service, /membershipCreatedByInvitation/, 'Invitation-created membership lifecycle is tracked');
expectText('src/lib/membership/service.ts', service, /invitation\.membershipCreatedByInvitation[\s\S]*status:\s*'inactive'/, 'Revoke/expiry can deactivate invitation-created access');
expectText('src/lib/membership/service.ts', service, /reconcileProvisionedInvitationForIdentity/, 'Authenticated invitation reconciliation is implemented');
expectText('src/lib/membership/service.ts', service, /invitation_worker_email_mismatch/, 'Worker/invitation email mismatch is blocked');
expectText('src/lib/membership/invitation-email.ts', email, /Set my password/, 'Branded password-setup call to action is present');
expectText('src/lib/membership/invitation-email.ts', email, /never emails your password/i, 'Invitation explicitly avoids emailing passwords');
expectText('src/lib/organization/service.ts', org, /reconcileProvisionedInvitationForIdentity/, 'Organization discovery reconciles pending provisioned invitations');
expectText('src/app/signin/page.tsx', signin, /\/api\/me\/organizations/, 'Sign-in resolves organization memberships');
expectText('src/components/employee-profile.tsx', profile, /Account & app access/, 'Employee Profile exposes account/app access controls');
expectText('src/components/employee-profile.tsx', profile, /Provision access & send invitation/, 'Employee Profile exposes invitation provisioning');
expectText('src/components/invitation-panel.tsx', panel, /Password setup link/, 'Invitation panel exposes password setup recovery information');
expectText('src/app/download-app/page.tsx', download, /NEXT_PUBLIC_OPSIQO_ANDROID_APP_URL/, 'Android distribution URL is environment-driven');
expectText('src/app/download-app/page.tsx', download, /NEXT_PUBLIC_OPSIQO_IOS_APP_URL/, 'iOS distribution URL is environment-driven');
expectText('src/app/api/organizations/[orgId]/employees/[workerId]/access/route.ts', route, /membership\.read/, 'Employee account-access endpoint is permission-gated');
expectText('src/domain/security.ts', security, /accountStatus\?:\s*'password_setup_pending'/, 'Invitation account status is represented in domain model');
expectText('.env.example', env, /NEXT_PUBLIC_OPSIQO_ANDROID_APP_URL=/, 'Android distribution environment variable documented');
expectText('.env.example', env, /NEXT_PUBLIC_OPSIQO_IOS_APP_URL=/, 'iOS distribution environment variable documented');

const forbidden = [
  /AIza[0-9A-Za-z_-]{20,}/,
  new RegExp('-----BEGIN ' + 'PRIVATE KEY-----'),
  /RESEND_API_KEY\s*=\s*re_[A-Za-z0-9]/,
];
for (const [rel, source] of [
  ['invitation-email.ts', email],
  ['account-access.ts', access],
  ['service.ts', service],
  ['.env.example', env],
]) {
  for (const pattern of forbidden) {
    if (pattern.test(source)) failures.push(`Credential-like material detected in ${rel}`);
  }
}

console.log('OPSIQO H48 PLATFORM AUDIT');
console.log(`PASS checks: ${passes.length}`);
for (const item of passes) console.log(`  PASS  ${item}`);

if (failures.length) {
  console.error(`FAIL checks: ${failures.length}`);
  for (const item of failures) console.error(`  FAIL  ${item}`);
  process.exit(1);
}

console.log('H48 PLATFORM AUDIT: PASS');
