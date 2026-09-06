import fs from 'node:fs';

const checks = [
  ['src/app/settings/mobile-invitations/page.tsx', 'OPSIQO Pulse Invitations'],
  ['src/components/pulse-invitation-settings-editor.tsx', 'iOS app link'],
  ['src/components/pulse-invitation-settings-editor.tsx', 'Future invitations will use these settings'],
  ['src/components/pulse-invitation-panel.tsx', 'Edit invitation content & app links'],
  ['src/lib/membership/pulse-invitation-settings.ts', 'settings/pulseInvitation'],
  ['src/lib/membership/pulse-invitation-settings.ts', 'membership.pulse_invitation_settings.update'],
  ['src/lib/membership/invitation-email.ts', 'renderPulseTemplateText'],
  ['src/lib/membership/invitation-email.ts', 'pulseSettings?: PulseInvitationSettings'],
  ['src/lib/membership/invitation-email.ts', 'input.pulseSettings || DEFAULT_PULSE_INVITATION_SETTINGS'],
  ['src/lib/membership/account-access.ts', 'getPulseInvitationSettingsByOrgId'],
  ['src/lib/membership/service.ts', 'getPulseInvitationSettingsByOrgId'],
  ['tests/opsiqo85/h50-2a-editable-pulse-invite.test.ts', 'H50.2A editable OPSIQO Pulse invitation'],
];

let failed = false;
for (const [file, needle] of checks) {
  const text = fs.readFileSync(file, 'utf8');
  const ok = text.includes(needle);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${file} :: ${needle}`);
  if (!ok) failed = true;
}

const invitation = fs.readFileSync('src/lib/membership/invitation-email.ts', 'utf8');
if (invitation.includes('Ã¢â‚¬â€œ') || invitation.includes('Ã¢â€ â€™')) {
  console.error('FAIL  invitation email still contains mojibake.');
  failed = true;
} else {
  console.log('PASS  invitation email encoding cleanup');
}

if (failed) process.exit(1);
console.log('H50.2A EDITABLE INVITATION AUDIT: PASS');