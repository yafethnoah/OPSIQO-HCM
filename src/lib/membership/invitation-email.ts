import type { Role } from '@/domain/security';
import {
  DEFAULT_PULSE_INVITATION_SETTINGS,
  type PulseInvitationSettings,
  type PulseInvitationLandingPath,
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

export function invitationDownloadUrl(orgId?: string) {
  const query = orgId ? `?orgId=${encodeURIComponent(orgId)}` : '';
  return `${baseUrl()}/download-app${query}`;
}

export function pulseDistributionLinks(
  settings?: Pick<PulseInvitationSettings, 'iosAppUrl' | 'androidAppUrl'>,
) {
  return {
    ios: safeHttpsUrl(settings?.iosAppUrl) || safeHttpsUrl(process.env.NEXT_PUBLIC_OPSIQO_IOS_APP_URL),
    android: safeHttpsUrl(settings?.androidAppUrl) || safeHttpsUrl(process.env.NEXT_PUBLIC_OPSIQO_ANDROID_APP_URL),
  };
}

export function invitationSignInUrl(orgId: string, returnTo?: PulseInvitationLandingPath) {
  const query = new URLSearchParams({ orgId });
  if (returnTo) query.set('returnTo', returnTo);
  return `${baseUrl()}/signin?${query.toString()}`;
}

export function invitationAcceptUrl(orgId: string, token: string) {
  return `${baseUrl()}/accept-invite?orgId=${encodeURIComponent(orgId)}&token=${encodeURIComponent(token)}`;
}

export function buildInvitationEmailHtml(input: {
  organizationName: string;
  role: Role;
  passwordSetupUrl: string;
  signInUrl: string;
  acceptUrl: string;
  downloadUrl: string;
  expiresAt: string;
  iosUrl?: string;
  androidUrl?: string;
  pulseSettings?: PulseInvitationSettings;
}) {
  const settings = input.pulseSettings || DEFAULT_PULSE_INVITATION_SETTINGS;
  const organizationNameRaw = input.organizationName || 'Your organization';
  const roleRaw = input.role.replaceAll('_', ' ');
  const expiresRaw = new Date(input.expiresAt).toLocaleDateString('en-CA');
  const values = { organization: organizationNameRaw, role: roleRaw, expires: expiresRaw };

  const heading = escapeHtml(renderPulseTemplateText(settings.heading, values));
  const intro = escapeHtml(renderPulseTemplateText(settings.introText, values));
  const passwordInstruction = escapeHtml(renderPulseTemplateText(settings.passwordInstruction, values));
  const activationInstruction = escapeHtml(renderPulseTemplateText(settings.activationInstruction, values));
  const signInInstruction = escapeHtml(renderPulseTemplateText(settings.signInInstruction, values));
  const mfaInstruction = escapeHtml(renderPulseTemplateText(settings.mfaInstruction, values));
  const permissionsInstruction = escapeHtml(renderPulseTemplateText(settings.permissionsInstruction, values));
  const attendanceInstruction = escapeHtml(renderPulseTemplateText(settings.attendanceInstruction, values));
  const supportText = escapeHtml(renderPulseTemplateText(settings.supportText, values));

  const passwordSetupUrl = escapeHtml(input.passwordSetupUrl);
  const signInUrl = escapeHtml(input.signInUrl);
  const acceptUrl = escapeHtml(input.acceptUrl);
  const downloadUrl = escapeHtml(input.downloadUrl);
  const iosUrl = escapeHtml(input.iosUrl || input.downloadUrl);
  const androidUrl = escapeHtml(input.androidUrl || input.downloadUrl);
  const iosButtonLabel = escapeHtml(settings.iosButtonLabel);
  const androidButtonLabel = escapeHtml(settings.androidButtonLabel);
  const webButtonLabel = escapeHtml(settings.webButtonLabel);
  const expires = escapeHtml(expiresRaw);

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
              <strong>1. Download OPSIQO Pulse</strong>
              <p style="margin:14px 0 8px">
                <a href="${iosUrl}" style="display:inline-block;background:#1f3a5f;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">${iosButtonLabel}</a>
                &nbsp;
                <a href="${androidUrl}" style="display:inline-block;background:#eef7f7;color:#173f4a;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">${androidButtonLabel}</a>
              </p>
              <p style="font-size:12px;color:#667085;margin:10px 0 0">If your app store link is not configured yet, these buttons open the governed OPSIQO download page.</p>
            </div>

            <p style="font-size:15px;line-height:1.65"><strong>2. Account setup</strong><br />${passwordInstruction}</p>
            <p style="margin:12px 0 22px"><a href="${passwordSetupUrl}" style="display:inline-block;background:#eef2f7;color:#1f3a5f;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Set my password</a></p>

            <p style="font-size:15px;line-height:1.65"><strong>3. Organization activation</strong><br />${activationInstruction}</p>
            <p style="margin:12px 0 22px"><a href="${acceptUrl}" style="display:inline-block;background:#1abcbd;color:#082f35;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:800">Open secure OPSIQO invitation</a></p>

            <p style="font-size:15px;line-height:1.65"><strong>4. Time & Leave access</strong><br />${signInInstruction}</p>
            <p style="margin:12px 0 22px"><a href="${signInUrl}" style="display:inline-block;background:#1f3a5f;color:white;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:800">${webButtonLabel}</a></p>

            <p style="font-size:15px;line-height:1.65"><strong>5. Multi-factor verification</strong><br />${mfaInstruction}</p>
            <p style="font-size:15px;line-height:1.65"><strong>6. Permissions</strong><br />${permissionsInstruction}</p>

            <div style="padding:16px 18px;background:#f8fafc;border:1px solid #e5e9f0;border-radius:12px;font-size:14px;line-height:1.65">${attendanceInstruction}</div>
            <div style="padding:16px 18px;background:#f8fafc;border:1px solid #e5e9f0;border-radius:12px;font-size:13px;line-height:1.6;color:#4b5563;margin-top:18px">
              <strong>Security:</strong> OPSIQO never emails your password. The invitation expires on ${expires}.
            </div>
            <p style="font-size:13px;line-height:1.6;color:#667085;margin-top:24px">${supportText}</p>
            <p style="font-size:12px;line-height:1.5;color:#7b8494">Download page: <a href="${downloadUrl}">open OPSIQO downloads</a></p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}
