'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_PULSE_INVITATION_SETTINGS,
  type PulseInvitationSettings,
} from '@/domain/pulse-invitation-settings';
import { activeOrgId, apiFetch } from '@/lib/http/client';

type Me = { actor: { permissions: string[] } };
type Editable = Omit<PulseInvitationSettings, 'id' | 'updatedAt' | 'updatedBy'>;

function editable(settings: PulseInvitationSettings): Editable {
  const { id: _id, updatedAt: _updatedAt, updatedBy: _updatedBy, ...rest } = settings;
  return rest;
}

function Field(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  placeholder?: string;
}) {
  return <label className="field">
    <span>{props.label}</span>
    <input
      className="input"
      value={props.value}
      disabled={props.disabled}
      placeholder={props.placeholder}
      onChange={(event) => props.onChange(event.target.value)}
    />
  </label>;
}

function TextArea(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  rows?: number;
}) {
  return <label className="field">
    <span>{props.label}</span>
    <textarea
      className="input"
      rows={props.rows || 3}
      value={props.value}
      disabled={props.disabled}
      onChange={(event) => props.onChange(event.target.value)}
    />
  </label>;
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
        apiFetch<{ data: PulseInvitationSettings }>(`/api/organizations/${orgId}/pulse-invitation-settings`),
      ]);
      setCanManage(me.actor.permissions.includes('membership.manage'));
      setSettings(result.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load invitation settings.');
    }
  }

  useEffect(() => { void load(); }, []);

  function patch(values: Partial<PulseInvitationSettings>) {
    setSettings((current) => current ? { ...current, ...values } : current);
  }

  async function save() {
    if (!settings || !canManage) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await apiFetch<{ data: PulseInvitationSettings }>(
        `/api/organizations/${activeOrgId()}/pulse-invitation-settings`,
        { method: 'PUT', body: JSON.stringify(editable(settings)) },
      );
      setSettings(result.data);
      setNotice('Invitation content, mobile app links and Time & Leave landing behavior saved. Future invitations will use these settings.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save invitation settings.');
    } finally {
      setBusy(false);
    }
  }

  function restoreDefaults() {
    if (!settings || !canManage) return;
    setSettings({
      ...DEFAULT_PULSE_INVITATION_SETTINGS,
      updatedAt: settings.updatedAt,
      updatedBy: settings.updatedBy,
    });
    setNotice('Defaults restored in the editor. Click Save changes to apply them.');
  }

  if (!settings) {
    return <section className="card stack">
      {error ? <div className="error">{error}</div> : <div className="muted">Loading OPSIQO Pulse invitation settings…</div>}
    </section>;
  }

  const example = (value: string) => value
    .replaceAll('{{organization}}', 'Example Organization')
    .replaceAll('{{role}}', 'employee')
    .replaceAll('{{expires}}', '2026-09-19');

  return <div className="stack">
    {error && <div className="error">{error}</div>}
    {notice && <div className="success">{notice}</div>}
    {!canManage && <div className="notice">You can view these settings. Editing requires membership.manage.</div>}

    <section className="card stack">
      <div>
        <span className="eyebrow">Mobile distribution</span>
        <h2 className="sectionTitle">OPSIQO Pulse app links</h2>
        <p className="muted">Add or replace TestFlight, App Store, Play Store or approved UAT distribution links without rebuilding OPSIQO.</p>
      </div>
      <div className="formGrid">
        <Field label="iOS app link" value={settings.iosAppUrl} disabled={!canManage} placeholder="https://testflight.apple.com/join/... or App Store URL" onChange={(iosAppUrl) => patch({ iosAppUrl })} />
        <Field label="Android app link" value={settings.androidAppUrl} disabled={!canManage} placeholder="https://play.google.com/store/apps/details?... or approved UAT URL" onChange={(androidAppUrl) => patch({ androidAppUrl })} />
        <Field label="iOS button label" value={settings.iosButtonLabel} disabled={!canManage} onChange={(iosButtonLabel) => patch({ iosButtonLabel })} />
        <Field label="Android button label" value={settings.androidButtonLabel} disabled={!canManage} onChange={(androidButtonLabel) => patch({ androidButtonLabel })} />
      </div>
      <div className="notice">App links must use HTTPS. If a link is blank, the invitation uses the governed OPSIQO download page instead of a broken store link.</div>
    </section>

    <section className="card stack">
      <div>
        <span className="eyebrow">Post-invitation landing</span>
        <h2 className="sectionTitle">Send employees to Time & Leave</h2>
        <p className="muted">The default is Time & Leave. The return path is restricted to approved internal OPSIQO routes to prevent open redirects.</p>
      </div>
      <div className="formGrid">
        <label className="field">
          <span>After sign-in / activation</span>
          <select className="input" value={settings.landingPath} disabled={!canManage} onChange={(event) => patch({ landingPath: event.target.value as PulseInvitationSettings['landingPath'] })}>
            <option value="/time">Time & Leave</option>
            <option value="/employee">Employee Portal</option>
            <option value="/home">My OPSIQO</option>
            <option value="/dashboard">Dashboard</option>
          </select>
        </label>
        <Field label="Web button label" value={settings.webButtonLabel} disabled={!canManage} onChange={(webButtonLabel) => patch({ webButtonLabel })} />
      </div>
    </section>

    <section className="card stack">
      <div>
        <span className="eyebrow">Invitation content</span>
        <h2 className="sectionTitle">Editable employee invitation</h2>
        <p className="muted">Supported placeholders: {'{{organization}}'}, {'{{role}}'}, {'{{expires}}'}.</p>
      </div>
      <Field label="Email subject" value={settings.emailSubject} disabled={!canManage} onChange={(emailSubject) => patch({ emailSubject })} />
      <Field label="Invitation heading" value={settings.heading} disabled={!canManage} onChange={(heading) => patch({ heading })} />
      <TextArea label="Introduction" value={settings.introText} disabled={!canManage} onChange={(introText) => patch({ introText })} />
      <TextArea label="Password instruction" value={settings.passwordInstruction} disabled={!canManage} onChange={(passwordInstruction) => patch({ passwordInstruction })} />
      <TextArea label="Activation instruction" value={settings.activationInstruction} disabled={!canManage} onChange={(activationInstruction) => patch({ activationInstruction })} />
      <TextArea label="Sign-in instruction" value={settings.signInInstruction} disabled={!canManage} onChange={(signInInstruction) => patch({ signInInstruction })} />
      <TextArea label="MFA instruction" value={settings.mfaInstruction} disabled={!canManage} onChange={(mfaInstruction) => patch({ mfaInstruction })} />
      <TextArea label="Permissions instruction" value={settings.permissionsInstruction} disabled={!canManage} onChange={(permissionsInstruction) => patch({ permissionsInstruction })} />
      <TextArea label="Time & Leave instruction" value={settings.attendanceInstruction} disabled={!canManage} rows={4} onChange={(attendanceInstruction) => patch({ attendanceInstruction })} />
      <TextArea label="Support / footer text" value={settings.supportText} disabled={!canManage} onChange={(supportText) => patch({ supportText })} />
      {canManage && <div className="row wrap">
        <button className="button" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save changes'}</button>
        <button className="button secondary" disabled={busy} onClick={restoreDefaults}>Restore defaults</button>
      </div>}
    </section>

    <section className="card stack">
      <div><span className="eyebrow">Preview</span><h2 className="sectionTitle">{example(settings.heading)}</h2></div>
      <p>{example(settings.introText)}</p>
      <div className="grid2">
        <div className="notice">iOS: {settings.iosAppUrl || 'OPSIQO download page fallback'}</div>
        <div className="notice">Android: {settings.androidAppUrl || 'OPSIQO download page fallback'}</div>
      </div>
      <div className="notice"><strong>{settings.webButtonLabel}</strong> → {settings.landingPath === '/time' ? 'Time & Leave' : settings.landingPath}</div>
      <ol>
        <li>{example(settings.passwordInstruction)}</li>
        <li>{example(settings.activationInstruction)}</li>
        <li>{example(settings.signInInstruction)}</li>
        <li>{example(settings.mfaInstruction)}</li>
        <li>{example(settings.permissionsInstruction)}</li>
      </ol>
      <div className="notice">{example(settings.attendanceInstruction)}</div>
      <div className="muted">{example(settings.supportText)}</div>
    </section>
  </div>;
}
