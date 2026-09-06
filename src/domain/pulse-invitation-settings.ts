export interface PulseInvitationSettings {
  id: 'pulse-invitation';
  emailSubject: string;
  heading: string;
  introText: string;
  iosAppUrl: string;
  androidAppUrl: string;
  iosButtonLabel: string;
  androidButtonLabel: string;
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
  passwordInstruction: 'Set your OPSIQO password if this is your first account. OPSIQO never sends your password by email.',
  activationInstruction: 'Open your secure organization invitation. The activation link is single-use and expires on {{expires}}.',
  signInInstruction: 'Sign in using the email address that received this invitation.',
  mfaInstruction: 'Complete multi-factor verification when prompted.',
  permissionsInstruction: 'Allow organization-required permissions when prompted. These may include notifications, attendance/location permissions, and supported device authentication.',
  attendanceInstruction: 'Attendance: Home -> Clock In -> Break when applicable -> Clock Out. OPSIQO Pulse may also provide leave, HR documents, notifications, learning and other employee services enabled by your organization.',
  supportText: 'If you need help, contact your organization HR or OPSIQO administrator. If you were not expecting this invitation, do not activate it.',
  updatedAt: '',
  updatedBy: '',
};