export type PulseInvitationLandingPath = '/time' | '/employee' | '/home' | '/dashboard';

export interface PulseInvitationSettings {
  id: 'pulse-invitation';
  emailSubject: string;
  heading: string;
  introText: string;
  iosAppUrl: string;
  androidAppUrl: string;
  iosButtonLabel: string;
  androidButtonLabel: string;
  landingPath: PulseInvitationLandingPath;
  webButtonLabel: string;
  passwordInstruction: string;
  activationInstruction: string;
  signInInstruction: string;
  mfaInstruction: string;
  permissionsInstruction: string;
  attendanceInstruction: string;
  supportText: string;
  updatedAt: string;
  updatedBy: string;
}

export const DEFAULT_PULSE_INVITATION_SETTINGS: PulseInvitationSettings = {
  id: 'pulse-invitation',
  emailSubject: 'Welcome to OPSIQO Pulse - {{organization}}',
  heading: 'Welcome to OPSIQO Pulse - {{organization}}',
  introText: 'You have been invited to use OPSIQO Pulse for {{organization}}. Your OPSIQO access role is {{role}}.',
  iosAppUrl: '',
  androidAppUrl: '',
  iosButtonLabel: 'Install on iPhone / iPad',
  androidButtonLabel: 'Install on Android',
  landingPath: '/time',
  webButtonLabel: 'Open Time & Leave',
  passwordInstruction: 'Set your OPSIQO password if this is your first account. OPSIQO never sends your password by email.',
  activationInstruction: 'Open your secure organization invitation. The activation link is single-use and expires on {{expires}}.',
  signInInstruction: 'Sign in using the email address that received this invitation. After sign-in, OPSIQO will take you to Time & Leave.',
  mfaInstruction: 'Complete multi-factor verification when prompted.',
  permissionsInstruction: 'Allow organization-required permissions when prompted. These may include notifications, attendance/location permissions, and supported device authentication.',
  attendanceInstruction: 'Time & Leave: use this page for Clock In, Break, Clock Out, timesheets, leave and other enabled attendance services.',
  supportText: 'If you need help, contact your organization HR or OPSIQO administrator. If you were not expecting this invitation, do not activate it.',
  updatedAt: '',
  updatedBy: '',
};
