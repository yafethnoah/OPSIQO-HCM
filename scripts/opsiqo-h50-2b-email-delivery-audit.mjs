import fs from 'node:fs';

const checks = [
  ['apphosting.uat.yaml', 'secret: UAT_OPSIQO_RESEND_API_KEY'],
  ['apphosting.uat.yaml', 'secret: UAT_OPSIQO_INVITATION_FROM_EMAIL'],
  ['apphosting.uat.yaml', 'value: opsiqo-hcm-uat-2026'],
  ['apphosting.uat.yaml', 'value: https://uat.opsiqo.ca'],
  ['src/lib/membership/service.ts', 'process.env.RESEND_API_KEY'],
  ['src/lib/membership/service.ts', 'process.env.INVITATION_FROM_EMAIL'],
  ['src/lib/membership/service.ts', 'https://api.resend.com/emails'],
  ['src/components/pulse-invitation-panel.tsx', 'Automatic email delivery failed'],
  ['tests/opsiqo85/h50-2b-email-delivery-config.test.ts', 'H50.2B automatic invitation email delivery'],
];

let failed = false;
for (const [file, needle] of checks) {
  const text = fs.readFileSync(file, 'utf8');
  const ok = text.includes(needle);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${file} :: ${needle}`);
  if (!ok) failed = true;
}

const uat = fs.readFileSync('apphosting.uat.yaml', 'utf8');
const forbidden = [
  /RESEND_API_KEY\s*\n\s*value:/,
  /INVITATION_FROM_EMAIL\s*\n\s*value:/,
  /re_[A-Za-z0-9_-]{12,}/,
];

for (const pattern of forbidden) {
  if (pattern.test(uat)) {
    console.error('FAIL  secret value or plaintext secret-style configuration detected in apphosting.uat.yaml');
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('H50.2B EMAIL DELIVERY AUDIT: PASS');