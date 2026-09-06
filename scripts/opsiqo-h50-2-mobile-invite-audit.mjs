import fs from 'node:fs';

const checks = [
  ['src/components/employee-profile.tsx', 'PulseInvitationPanel'],
  ['src/components/pulse-invitation-panel.tsx', 'Send OPSIQO Pulse invitation'],
  ['src/components/pulse-invitation-panel.tsx', 'QRCode.toDataURL'],
  ['src/components/pulse-invite-landing.tsx', "sessionStorage.setItem(STORAGE_KEY"],
  ['src/components/pulse-invite-landing.tsx', "window.history.replaceState(null, '', '/invite')"],
  ['src/app/api/mobile-invitations/resolve/route.ts', "Cache-Control': 'no-store, private"],
  ['src/lib/membership/service.ts', 'const tokenHash = hashToken(input.token)'],
  ['src/lib/membership/service.ts', "eventType: 'opened'"],
  ['src/lib/membership/service.ts', "experience: input.experience"],
  ['src/lib/membership/invitation-email.ts', '/invite#orgId='],
  ['src/lib/membership/invitation-email.ts', 'OPSIQO Pulse'],
  ['src/domain/security.ts', 'firstClockInAt?: string'],
  ['tests/opsiqo85/h50-2-mobile-invite.test.ts', 'H50.2 OPSIQO Pulse mobile invitation'],
];

let failed = false;
for (const [file, needle] of checks) {
  const text = fs.readFileSync(file, 'utf8');
  const ok = text.includes(needle);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${file} :: ${needle}`);
  if (!ok) failed = true;
}

const email = fs.readFileSync('src/lib/membership/invitation-email.ts', 'utf8');
if (email.includes('/invite?orgId=')) {
  console.error('FAIL  Pulse invitation token must not be placed in the /invite query string.');
  failed = true;
} else {
  console.log('PASS  Pulse invitation token query-string leak guard');
}

if (failed) process.exit(1);
console.log('H50.2 MOBILE INVITATION AUDIT: PASS');