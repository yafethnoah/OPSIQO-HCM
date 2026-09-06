'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_PULSE_INVITATION_SETTINGS,
  type PulseInvitationSettings,
} from '@/domain/pulse-invitation-settings';
import { activeOrgId, apiFetch } from '@/lib/http/client';

type Me = {
  actor: {
    permissions: string[];
  };
};

type Editable = Omit<PulseInvitationSettings, 'id' | 'updatedAt' | 'updatedBy'>;

function editable(settings: PulseInvitationSettings): Editable {
  const {
    id: _id,
    updatedAt: _updatedAt,
    updatedBy: _updatedBy,
    ...rest
  } = settings;
  return rest;
}

function Field({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        className="input"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  disabled,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  rows?: number;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea
        className="input"
        rows={rows}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function PulseInvitationSettingsEditor() {
  const [settings, setSettings] = useState<PulseInvitationSettings | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    setError('');
    try {
      const orgId = activeOrgId();
      const [me, result] = await Promise.all([
        apiFetch<Me>('/api/me'),
        apiFetch<{ data: PulseInvitationSettings }>(
          `/api/organizations/${orgId}/pulse-invitation-settings`,
        ),
      ]);
      setCanManage(me.actor.permissions.includes('platform.manage'));
      setSettings(result.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load OPSIQO Pulse invitation settings.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    if (!settings || !canManage) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await apiFetch<{ data: PulseInvitationSettings }>(
        `/api/organizations/${activeOrgId()}/pulse-invitation-settings`,
        {
          method: 'PUT',
          body: JSON.stringify(editable(settings)),
        },
      );
      setSettings(result.data);
      setNotice('OPSIQO Pulse invitation content and app links saved. Future invitations will use these settings.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save OPSIQO Pulse invitation settings.');
    } finally {
      setBusy(false);
    }
  }

  function patch(values: Partial<PulseInvitationSettings>) {
    if (!settings) return;
    setSettings({ ...settings, ...values });
  }

  function restoreDefaults() {
    if (!settings || !canManage) return;
    setSettings({
      ...DEFAULT_PULSE_INVITATION_SETTINGS,
      updatedAt: settings.updatedAt,
      updatedBy: settings.updatedBy,
    });
    setNotice('Default text restored in the editor. Click Save changes to apply it.');
  }

  if (!settings) {
    return (
      <section className="card stack">
        {error ? <div className="error">{error}</div> : <div className="muted">Loading OPSIQO Pulse invitation settings...</div>}
      </section>
    );
  }

  return (
    <div className="stack">
      {error && <div className="error">{error}</div>}
      {notice && <div className="success">{notice}</div>}

      {!canManage && (
        <div className="notice">
          You can view the organization invitation template, but editing requires platform.manage.
        </div>
      )}

      <section className="card stack">
        <div>
          <span className="eyebrow">Mobile distribution</span>
          <h2 className="sectionTitle">OPSIQO Pulse app links</h2>
          <p className="muted">
            These links are organization settings stored in OPSIQO. You can add or replace the TestFlight, App Store, or Google Play URL later without rebuilding or redeploying OPSIQO.
          </p>
        </div>

        <div className="formGrid">
          <Field
            label="iOS app link"
            value={settings.iosAppUrl}
            disabled={!canManage}
            placeholder="https://testflight.apple.com/join/... or App Store URL"
            onChange={(iosAppUrl) => patch({ iosAppUrl })}
          />
          <Field
            label="Android app link"
            value={settings.androidAppUrl}
            disabled={!canManage}
            placeholder="https://play.google.com/store/apps/details?..."
            onChange={(androidAppUrl) => patch({ androidAppUrl })}
          />
          <Field
            label="iOS button label"
            value={settings.iosButtonLabel}
            disabled={!canManage}
            onChange={(iosButtonLabel) => patch({ iosButtonLabel })}
          />
          <Field
            label="Android button label"
            value={settings.androidButtonLabel}
            disabled={!canManage}
            onChange={(androidButtonLabel) => patch({ androidButtonLabel })}
          />
        </div>

        <div className="notice">
          App links must use HTTPS. Leave a platform blank until it is available; OPSIQO will use the governed download-instructions page instead of a broken link.
        </div>
      </section>

      <section className="card stack">
        <div>
          <span className="eyebrow">Invitation content</span>
          <h2 className="sectionTitle">Editable employee invitation</h2>
          <p className="muted">
            Content is plain text and safely escaped before email rendering. Supported placeholders: {'{{organization}}'}, {'{{role}}'}, {'{{expires}}'}.
          </p>
        </div>

        <Field
          label="Email subject"
          value={settings.emailSubject}
          disabled={!canManage}
          onChange={(emailSubject) => patch({ emailSubject })}
        />
        <Field
          label="Invitation heading"
          value={settings.heading}
          disabled={!canManage}
          onChange={(heading) => patch({ heading })}
        />
        <TextArea
          label="Introduction"
          value={settings.introText}
          disabled={!canManage}
          onChange={(introText) => patch({ introText })}
        />
        <TextArea
          label="Password instruction"
          value={settings.passwordInstruction}
          disabled={!canManage}
          onChange={(passwordInstruction) => patch({ passwordInstruction })}
        />
        <TextArea
          label="Activation instruction"
          value={settings.activationInstruction}
          disabled={!canManage}
          onChange={(activationInstruction) => patch({ activationInstruction })}
        />
        <TextArea
          label="Sign-in instruction"
          value={settings.signInInstruction}
          disabled={!canManage}
          onChange={(signInInstruction) => patch({ signInInstruction })}
        />
        <TextArea
          label="MFA instruction"
          value={settings.mfaInstruction}
          disabled={!canManage}
          onChange={(mfaInstruction) => patch({ mfaInstruction })}
        />
        <TextArea
          label="Permissions instruction"
          value={settings.permissionsInstruction}
          disabled={!canManage}
          onChange={(permissionsInstruction) => patch({ permissionsInstruction })}
        />
        <TextArea
          label="Attendance / employee-service instruction"
          value={settings.attendanceInstruction}
          disabled={!canManage}
          rows={4}
          onChange={(attendanceInstruction) => patch({ attendanceInstruction })}
        />
        <TextArea
          label="Support / footer text"
          value={settings.supportText}
          disabled={!canManage}
          onChange={(supportText) => patch({ supportText })}
        />

        {canManage && (
          <div className="row wrap">
            <button className="button" disabled={busy} onClick={() => void save()}>
              {busy ? 'Saving...' : 'Save changes'}
            </button>
            <button className="button secondary" disabled={busy} onClick={restoreDefaults}>
              Restore default text
            </button>
          </div>
        )}
      </section>

      <section className="card stack">
        <div>
          <span className="eyebrow">Preview</span>
          <h2 className="sectionTitle">
            {settings.heading
              .replaceAll('{{organization}}', 'Example Organization')
              .replaceAll('{{role}}', 'employee')
              .replaceAll('{{expires}}', '2026-09-13')}
          </h2>
        </div>
        <p>
          {settings.introText
            .replaceAll('{{organization}}', 'Example Organization')
            .replaceAll('{{role}}', 'employee')
            .replaceAll('{{expires}}', '2026-09-13')}
        </p>
        <div className="grid2">
          <div className="notice">
            iOS: {settings.iosAppUrl || 'Not configured - download instructions will be used'}
          </div>
          <div className="notice">
            Android: {settings.androidAppUrl || 'Not configured - download instructions will be used'}
          </div>
        </div>
        <ol>
          <li>{settings.passwordInstruction}</li>
          <li>{settings.activationInstruction.replaceAll('{{expires}}', '2026-09-13')}</li>
          <li>{settings.signInInstruction}</li>
          <li>{settings.mfaInstruction}</li>
          <li>{settings.permissionsInstruction}</li>
        </ol>
        <div className="notice">{settings.attendanceInstruction}</div>
        <div className="muted">{settings.supportText}</div>
      </section>
    </div>
  );
}