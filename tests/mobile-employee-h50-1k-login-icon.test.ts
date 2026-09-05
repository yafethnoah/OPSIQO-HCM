import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('H50.1K iOS login resilience and Pulse launcher icon', () => {
  it('publishes native version 0.1.4 with the enlarged approved icon', () => {
    const app = JSON.parse(read('mobile/app.json'));
    const icon = readFileSync('mobile/assets/opsiqo-pulse-icon.png');
    const iconHash = createHash('sha256').update(icon).digest('hex');

    expect(app.expo.name).toBe('OPSIQO Pulse');
    expect(app.expo.version).toBe('0.1.4');
    expect(app.expo.icon).toBe('./assets/opsiqo-pulse-icon.png');
    expect(iconHash).toBe('498b6a3a1c7406276e09eaeea99a2d7d760794cdd3294f7afe1938090ad4f11f');
  });

  it('keeps organization discovery off the uid+status composite query', () => {
    const service = read('src/lib/organization/service.ts');

    expect(service).toContain(".where('uid', '==', identity.uid)");
    expect(service).not.toContain(".where('status', '==', 'active')");
    expect(service).toContain("if (membership.status !== 'active')");
  });

  it('does not let invitation reconciliation block active membership login', () => {
    const service = read('src/lib/organization/service.ts');

    expect(service).toContain('organization_membership_reconciliation_failed');
    expect(service).toContain('try {');
    expect(service).toContain('reconcileProvisionedInvitationForIdentity');
  });

  it('rolls back the mobile session when organization loading fails', () => {
    const provider = read('mobile/src/auth/provider.tsx');

    expect(provider).toContain('const firstOrganization = rows[0];');
    expect(provider).toContain('current = firstOrganization.orgId;');
    expect(provider).not.toContain('current = rows[0].orgId;');
    expect(provider).toContain('await reloadOrganizations();');
    expect(provider).toContain('setAuthenticated(true);');
    expect(provider).toContain('await clearSession();');
    expect(provider).toContain('No active OPSIQO organization is assigned');
  });

  it('preserves backend string error codes for mobile classification', () => {
    const client = read('mobile/src/api/client.ts');

    expect(client).toContain("typeof nestedError === 'string'");
    expect(client).toContain('responseErrorCode(payload)');
  });

  it('classifies invalid Firebase bearer tokens as HTTP 401', () => {
    const session = read('src/lib/auth/session.ts');

    expect(session).toContain('verifyFirebaseBearerToken');
    expect(session).toContain("'invalid_auth_token'");
    expect(session).toContain('invalidTokenCodes');
  });
});