'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/http/client';

type PlatformAccess = {
  allowed: boolean;
  email: string;
  source: string;
};

type PlatformOrganization = {
  id: string;
  name: string;
  legalName?: string;
  slug?: string;
  country?: string;
  region?: string;
  timezone?: string;
  industry?: string;
  sizeBand?: string;
  primaryAdminEmail?: string;
  status: string;
  lifecycleStatus: 'active' | 'suspended' | 'archived';
  provisioningStatus: string;
  onboardingStatus: string;
  createdAt: string;
  updatedAt: string;
};

type CreateResult = {
  orgId: string;
  replayed: boolean;
  invitation: {
    delivery: 'email' | 'manual' | 'existing';
    invitationId: string;
    inviteUrl?: string;
    deliveryError?: string;
  };
};

function newIdempotencyKey(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function PlatformOrganizationsWorkspace() {
  const [access, setAccess] = useState<PlatformAccess | null>(null);
  const [organizations, setOrganizations] = useState<PlatformOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

  const activeCount = useMemo(
    () => organizations.filter((org) => org.lifecycleStatus === 'active').length,
    [organizations],
  );

  async function load() {
    setError('');
    setLoading(true);
    try {
      const [accessResponse, orgResponse] = await Promise.all([
        apiFetch<{ data: PlatformAccess }>('/api/platform/access', { orgContext: 'omit' }),
        apiFetch<{ data: PlatformOrganization[] }>('/api/platform/organizations', { orgContext: 'omit' }),
      ]);
      setAccess(accessResponse.data);
      setOrganizations(orgResponse.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load platform organization administration.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    setInviteUrl('');
    setBusy('create');

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      idempotencyKey,
      organizationName: String(form.get('organizationName') || '').trim(),
      legalName: String(form.get('legalName') || '').trim() || undefined,
      slug: String(form.get('slug') || '').trim() || undefined,
      country: String(form.get('country') || '').trim(),
      region: String(form.get('region') || '').trim() || undefined,
      timezone: String(form.get('timezone') || '').trim(),
      industry: String(form.get('industry') || '').trim() || undefined,
      sizeBand: String(form.get('sizeBand') || '').trim() || undefined,
      defaultLanguage: String(form.get('defaultLanguage') || 'en').trim(),
      primaryAdminEmail: String(form.get('primaryAdminEmail') || '').trim(),
      primaryAdminFirstName: String(form.get('primaryAdminFirstName') || '').trim(),
      primaryAdminLastName: String(form.get('primaryAdminLastName') || '').trim(),
    };

    try {
      const response = await apiFetch<{ data: CreateResult }>('/api/platform/organizations', {
        method: 'POST',
        orgContext: 'omit',
        body: JSON.stringify(payload),
      });

      if (response.data.invitation.inviteUrl) setInviteUrl(response.data.invitation.inviteUrl);
      setNotice(
        response.data.replayed
          ? 'The prior idempotent provisioning request was safely reused. No duplicate organization was created.'
          : response.data.invitation.delivery === 'email'
            ? 'Organization created. The primary administrator invitation was sent by email.'
            : 'Organization created. Use the secure invitation link below if email delivery is not configured.',
      );

      setIdempotencyKey(newIdempotencyKey());
      formElement.reset();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to create organization.');
    } finally {
      setBusy('');
    }
  }

  async function organizationAction(org: PlatformOrganization, action: 'activate' | 'suspend' | 'archive' | 'resend_primary_admin_invitation') {
    if (action === 'archive' && !window.confirm(`Archive ${org.name}? Archived organizations cannot be reactivated through the standard workflow.`)) return;
    if (action === 'suspend' && !window.confirm(`Suspend ${org.name}? Tenant access will be blocked until the organization is reactivated.`)) return;

    setError('');
    setNotice('');
    setInviteUrl('');
    setBusy(`${org.id}:${action}`);

    try {
      const response = await apiFetch<{ data: { invitation?: { inviteUrl?: string } } }>(
        `/api/platform/organizations/${encodeURIComponent(org.id)}`,
        {
          method: 'PATCH',
          orgContext: 'omit',
          body: JSON.stringify({ action }),
        },
      );

      const resentLink = response.data.invitation?.inviteUrl;
      if (resentLink) setInviteUrl(resentLink);
      setNotice(
        action === 'resend_primary_admin_invitation'
          ? 'Primary administrator invitation rotated and resent. Any prior pending token is invalid.'
          : `Organization lifecycle updated: ${action}.`,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : `Unable to ${action} organization.`);
    } finally {
      setBusy('');
    }
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setNotice('Secure invitation link copied. Share it only with the intended administrator.');
    } catch {
      setError('Clipboard access is unavailable. Copy the secure invitation link manually.');
    }
  }

  return <div className="stack">
    <div className="pageHeader">
      <div>
        <span className="eyebrow">Platform administration</span>
        <h1>Organizations</h1>
        <p>Create, govern and lifecycle-manage OPSIQO tenants without reopening the one-time first-organization bootstrap.</p>
      </div>
      <div className="stepActions">
        <Link className="button secondary" href="/dashboard">Back to organization</Link>
      </div>
    </div>

    {loading && <div className="card"><p className="muted">Loading platform organization administration…</p></div>}
    {error && <div className="error">{error}</div>}

    {!loading && access && <>
      <div className="grid3">
        <div className="card"><div className="metricLabel">Platform administrator</div><div className="metricValue">Authorized</div><div className="muted">{access.email}</div></div>
        <div className="card"><div className="metricLabel">Organizations</div><div className="metricValue">{organizations.length}</div><div className="muted">All governed tenants</div></div>
        <div className="card"><div className="metricLabel">Active tenants</div><div className="metricValue">{activeCount}</div><div className="muted">Access currently enabled</div></div>
      </div>

      <div className="grid2">
        <form className="card stack" onSubmit={createOrganization}>
          <div>
            <h2 className="sectionTitle">Create organization</h2>
            <p className="muted">Creates the tenant, root organization unit, primary administrator worker/position, secure settings, audit evidence and initial administrator invitation.</p>
          </div>

          <label className="field"><span>Organization display name</span><input className="input" name="organizationName" required minLength={2} maxLength={120} placeholder="Kris Atelier" /></label>
          <label className="field"><span>Legal name</span><input className="input" name="legalName" maxLength={160} placeholder="Optional legal entity name" /></label>
          <label className="field"><span>Tenant slug (optional)</span><input className="input" name="slug" maxLength={64} placeholder="kris-atelier" /></label>

          <div className="formGrid">
            <label className="field"><span>Country</span><input className="input" name="country" defaultValue="Canada" required /></label>
            <label className="field"><span>Province / region</span><input className="input" name="region" defaultValue="Ontario" /></label>
          </div>

          <div className="formGrid">
            <label className="field"><span>Timezone</span><input className="input" name="timezone" defaultValue="America/Toronto" required /></label>
            <label className="field"><span>Default language</span><select className="input" name="defaultLanguage" defaultValue="en"><option value="en">English</option><option value="fr">French</option><option value="ar">Arabic</option></select></label>
          </div>

          <div className="formGrid">
            <label className="field"><span>Industry</span><input className="input" name="industry" placeholder="Beauty & personal care" /></label>
            <label className="field"><span>Organization size</span><select className="input" name="sizeBand" defaultValue="11-50"><option value="1-10">1–10</option><option value="11-50">11–50</option><option value="51-200">51–200</option><option value="201-500">201–500</option><option value="501-1000">501–1,000</option><option value="1001-5000">1,001–5,000</option><option value="5001+">5,001+</option></select></label>
          </div>

          <h3 className="sectionTitle">Primary organization administrator</h3>
          <label className="field"><span>Administrator email</span><input className="input" type="email" name="primaryAdminEmail" required /></label>
          <div className="formGrid">
            <label className="field"><span>First name</span><input className="input" name="primaryAdminFirstName" required maxLength={80} /></label>
            <label className="field"><span>Last name</span><input className="input" name="primaryAdminLastName" required maxLength={80} /></label>
          </div>

          <button className="button" disabled={busy === 'create'}>{busy === 'create' ? 'Provisioning organization…' : 'Create organization securely'}</button>
        </form>

        <div className="card stack">
          <h2 className="sectionTitle">Provisioning controls</h2>
          <div className="securityChecklist">
            <div>✓ Platform-admin authorization is separate from tenant roles</div>
            <div>✓ MFA is required by default for platform administration</div>
            <div>✓ Tenant slug is reserved transactionally</div>
            <div>✓ Idempotency prevents duplicate organizations</div>
            <div>✓ Initial worker, position and org unit are transactional</div>
            <div>✓ Primary admin uses the governed single-use invitation flow</div>
            <div>✓ New organizations default to privileged-user MFA policy</div>
            <div>✓ Organization lifecycle uses suspend/archive, never destructive delete</div>
            <div>✓ Organization and platform audit evidence are written</div>
          </div>
          {notice && <div className="notice">{notice}</div>}
          {inviteUrl && <div className="stack"><div className="metricLabel">Secure primary-admin invitation link</div><div className="copyBox">{inviteUrl}</div><button type="button" className="button secondary compact" onClick={copyInvite}>Copy secure link</button></div>}
        </div>
      </div>

      <section className="card tableWrap">
        <h2 className="sectionTitle">Organization lifecycle</h2>
        <table>
          <thead><tr><th>Organization</th><th>Primary admin</th><th>Location</th><th>Lifecycle</th><th>Provisioning</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>
            {organizations.map((org) => <tr key={org.id}>
              <td><strong>{org.name}</strong><div className="muted">{org.slug || org.id}</div></td>
              <td>{org.primaryAdminEmail || 'Not recorded'}</td>
              <td>{[org.region, org.country].filter(Boolean).join(', ') || 'Not configured'}</td>
              <td><span className="badge">{org.lifecycleStatus}</span></td>
              <td><span className="badge">{org.provisioningStatus}</span></td>
              <td>{org.createdAt ? new Date(org.createdAt).toLocaleDateString() : 'Legacy'}</td>
              <td><div className="stepActions">
                {org.lifecycleStatus === 'active' && <button type="button" className="button secondary" disabled={!!busy} onClick={() => organizationAction(org, 'suspend')}>Suspend</button>}
                {org.lifecycleStatus === 'suspended' && <button type="button" className="button secondary" disabled={!!busy} onClick={() => organizationAction(org, 'activate')}>Activate</button>}
                {org.lifecycleStatus === 'suspended' && <button type="button" className="button dangerButton" disabled={!!busy} onClick={() => organizationAction(org, 'archive')}>Archive</button>}
                {org.lifecycleStatus !== 'archived' && org.provisioningStatus !== 'legacy' && <button type="button" className="button secondary" disabled={!!busy} onClick={() => organizationAction(org, 'resend_primary_admin_invitation')}>Resend admin invite</button>}
              </div></td>
            </tr>)}
            {!organizations.length && <tr><td colSpan={7} className="muted">No organizations have been provisioned yet.</td></tr>}
          </tbody>
        </table>
      </section>
    </>}
  </div>;
}
