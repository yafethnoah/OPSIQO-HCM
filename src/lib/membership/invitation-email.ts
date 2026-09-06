import type { Role } from '@/domain/security';
import {
  DEFAULT_PULSE_INVITATION_SETTINGS,
  type PulseInvitationSettings,
} from '@/domain/pulse-invitation-settings';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function baseUrl() {
  return (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function safeHttpsUrl(value: unknown) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

export function renderPulseTemplateText(
  template: string,
  values: { organization: string; role: string; expires: string },
) {
  return String(template || '')
    .replaceAll('{{organization}}', values.organization)
    .replaceAll('{{role}}', values.role)
    .replaceAll('{{expires}}', values.expires);
}

export function invitationDownloadUrl() {
  return `${baseUrl()}/download-app`;
}

export function pulseDistributionLinks(
  settings?: Pick<PulseInvitationSettings, 'iosAppUrl' | 'androidAppUrl'>,
) {
  return {
    ios: safeHttpsUrl(settings?.iosAppUrl) || safeHttpsUrl(process.env.NEXT_PUBLIC_OPSIQO_IOS_APP_URL),
    android: safeHttpsUrl(settings?.androidAppUrl) || safeHttpsUrl(process.env.NEXT_PUBLIC_OPSIQO_ANDROID_APP_URL),
  };
}

export function invitationSignInUrl(orgId: string) {
  return `${baseUrl()}/signin?orgId=${encodeURIComponent(orgId)}`;
}

export function invitationAcceptUrl(orgId: string, token: string) {
  return `${baseUrl()}/accept-invite?orgId=${encodeURIComponent(orgId)}&token=${encodeURIComponent(token)}`;
}

export function pulseInvitationAcceptUrl(orgId: string, token: string) {
  return `${baseUrl()}/invite#orgId=${encodeURIComponent(orgId)}&token=${encodeURIComponent(token)}`;
}

export function buildInvitationEmailHtml(input: {
  organizationName: string;
  role: Role;
  passwordSetupUrl: string;
  signInUrl: string;
  acceptUrl: string;
  downloadUrl: string;
  expiresAt: string;
  experience?: 'standard' | 'pulse';
  iosUrl?: string;
  androidUrl?: string;
  supportEmail?: string;
  pulseSettings?: PulseInvitationSettings;
}) {
  const organizationNameRaw = input.organizationName || 'Your organization';
  const roleRaw = input.role.replaceAll('_', ' ');
  const expiresRaw = new Date(input.expiresAt).toLocaleDateString('en-CA');
  const templateValues = {
    organization: organizationNameRaw,
    role: roleRaw,
    expires: expiresRaw,
  };

  const organizationName = escapeHtml(organizationNameRaw);
  const role = escapeHtml(roleRaw);
  const passwordSetupUrl = escapeHtml(input.passwordSetupUrl);
  const signInUrl = escapeHtml(input.signInUrl);
  const acceptUrl = escapeHtml(input.acceptUrl);
  const downloadUrl = escapeHtml(input.downloadUrl);
  const expires = escapeHtml(expiresRaw);
  const iosUrl = escapeHtml(input.iosUrl || input.downloadUrl);
  const androidUrl = escapeHtml(input.androidUrl || input.downloadUrl);

  if (input.experience === 'pulse') {
    // Backward compatibility is mandatory: H50.2 callers that do not yet
    // provide organization settings must still receive the branded Pulse
    // invitation, using the governed defaults. Organization-specific settings
    // override these defaults when supplied.
    const settings = input.pulseSettings || DEFAULT_PULSE_INVITATION_SETTINGS;
    const heading = escapeHtml(renderPulseTemplateText(settings.heading, templateValues));
    const intro = escapeHtml(renderPulseTemplateText(settings.introText, templateValues));
    const passwordInstruction = escapeHtml(renderPulseTemplateText(settings.passwordInstruction, templateValues));
    const activationInstruction = escapeHtml(renderPulseTemplateText(settings.activationInstruction, templateValues));
    const signInInstruction = escapeHtml(renderPulseTemplateText(settings.signInInstruction, templateValues));
    const mfaInstruction = escapeHtml(renderPulseTemplateText(settings.mfaInstruction, templateValues));
    const permissionsInstruction = escapeHtml(renderPulseTemplateText(settings.permissionsInstruction, templateValues));
    const attendanceInstruction = escapeHtml(renderPulseTemplateText(settings.attendanceInstruction, templateValues));
    const supportText = escapeHtml(renderPulseTemplateText(settings.supportText, templateValues));
    const iosButtonLabel = escapeHtml(settings.iosButtonLabel);
    const androidButtonLabel = escapeHtml(settings.androidButtonLabel);

    return `<!doctype html>
<html>
  <body style="margin:0;background:#f4f7fa;font-family:Arial,Helvetica,sans-serif;color:#172033">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fa;padding:24px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border:1px solid #dfe6ee;border-radius:20px;overflow:hidden">
          <tr><td style="padding:30px 34px;background:#1f3a5f;color:white">
            <div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;opacity:.8">OPSIQO Pulse</div>
            <h1 style="margin:8px 0 0;font-size:27px">${heading}</h1>
          </td></tr>
          <tr><td style="padding:30px 34px">
            <p style="font-size:16px;line-height:1.65;margin-top:0">${intro}</p>

            <div style="padding:18px;background:#f7fbfb;border:1px solid #d7ecec;border-radius:14px;margin:22px 0">
              <strong>1. Install OPSIQO Pulse</strong>
              <p style="margin:14px 0 8px">
                <a href="${iosUrl}" style="display:inline-block;background:#1f3a5f;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">${iosButtonLabel}</a>
                &nbsp;
                <a href="${androidUrl}" style="display:inline-block;background:#eef7f7;color:#173f4a;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">${androidButtonLabel}</a>
              </p>
            </div>

            <p style="font-size:15px;line-height:1.65"><strong>2. Account setup</strong><br />${passwordInstruction}</p>
            <p style="margin:12px 0 22px"><a href="${passwordSetupUrl}" style="display:inline-block;background:#eef2f7;color:#1f3a5f;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Set / reset my password</a></p>

            <p style="font-size:15px;line-height:1.65"><strong>3. Organization activation</strong><br />${activationInstruction}</p>
            <p style="margin:12px 0 22px"><a href="${acceptUrl}" style="display:inline-block;background:#1abcbd;color:#082f35;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:800">Open secure OPSIQO Pulse invitation</a></p>

            <p style="font-size:15px;line-height:1.65"><strong>4. Sign in</strong><br />${signInInstruction}<br /><a href="${signInUrl}">Open OPSIQO sign in</a></p>
            <p style="font-size:15px;line-height:1.65"><strong>5. Multi-factor verification</strong><br />${mfaInstruction}</p>
            <p style="font-size:15px;line-height:1.65"><strong>6. Permissions</strong><br />${permissionsInstruction}</p>

            <div style="padding:16px 18px;background:#f8fafc;border:1px solid #e5e9f0;border-radius:12px;font-size:14px;line-height:1.65">${attendanceInstruction}</div>
            <p style="font-size:13px;line-height:1.6;color:#667085;margin-top:24px">${supportText}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
  }

  const support = input.supportEmail
    ? `Contact <a href="mailto:${escapeHtml(input.supportEmail)}">${escapeHtml(input.supportEmail)}</a> for support.`
    : 'Contact your organization HR or OPSIQO administrator for support.';

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f6f8fb;font-family:Arial,Helvetica,sans-serif;color:#172033">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f8fb;padding:24px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e5e9f0;border-radius:18px;overflow:hidden">
          <tr><td style="padding:28px 32px;background:#1f3a5f;color:white">
            <div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;opacity:.8">OPSIQO HCM</div>
            <h1 style="margin:8px 0 0;font-size:26px">Your employee access is ready</h1>
          </td></tr>
          <tr><td style="padding:30px 32px">
            <p style="font-size:16px;line-height:1.6;margin-top:0"><strong>${organizationName}</strong> has invited you to OPSIQO as <strong>${role}</strong>.</p>
            <p style="font-size:15px;line-height:1.6">Use the buttons below to set your own password, sign in, and access the OPSIQO apps. Your organization is linked automatically; you will never need to enter an organization ID.</p>

            <p style="margin:28px 0 14px"><a href="${passwordSetupUrl}" style="display:inline-block;background:#1f3a5f;color:white;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:700">1. Set my password</a></p>
            <p style="margin:14px 0"><a href="${downloadUrl}" style="display:inline-block;background:#eef7f7;color:#173f4a;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:700">2. Download OPSIQO</a></p>
            <p style="margin:14px 0 24px"><a href="${signInUrl}" style="display:inline-block;background:#f1f4f8;color:#1f3a5f;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:700">3. Sign in</a></p>

            <div style="padding:16px 18px;background:#f8fafc;border:1px solid #e5e9f0;border-radius:12px;font-size:13px;line-height:1.6;color:#4b5563">
              <strong>Security:</strong> OPSIQO never emails your password. The password setup link is generated by Firebase Authentication for your account. The invitation expires on ${expires}.
            </div>

            <p style="font-size:13px;line-height:1.6;color:#6b7280;margin-top:24px">If you prefer the web acceptance flow, you can also <a href="${acceptUrl}">open the secure invitation</a>. ${support}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}