import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { FIRST_ORGANIZATION_BOOTSTRAP_ROLE } from '@/lib/organization/bootstrap';

const source = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('H51 UAT defect repairs', () => {
  it('gives the controlled first-organization bootstrap identity the platform super-admin role', () => {
    expect(FIRST_ORGANIZATION_BOOTSTRAP_ROLE).toBe('super_admin');

    const bootstrap = source('src/lib/organization/bootstrap.ts');

    expect(bootstrap).toContain(
      'role: FIRST_ORGANIZATION_BOOTSTRAP_ROLE',
    );
    expect(bootstrap).toContain(
      'permissions: permissionsForRole(FIRST_ORGANIZATION_BOOTSTRAP_ROLE)',
    );
    expect(bootstrap).not.toContain("role: 'org_admin'");
  });

  it('captures the platform-tenant form element before the async request and resets the stable reference', () => {
    const ui = source('src/components/platform-tenant-workspace.tsx');

    const captureIndex = ui.indexOf(
      'const formElement=e.currentTarget;',
    );
    const requestIndex = ui.indexOf(
      "await apiFetch<{data:Created}>('/api/platform/tenants'",
    );

    expect(captureIndex).toBeGreaterThanOrEqual(0);
    expect(requestIndex).toBeGreaterThan(captureIndex);
    expect(ui).toContain('new FormData(formElement)');
    expect(ui).toContain('formElement.reset()');
    expect(ui).not.toContain('e.currentTarget.reset()');
  });
});