import { describe, expect, it } from 'vitest';
import { workerDirectoryEntry } from '@/lib/hr/directory';
import { permissionsForRole } from '@/lib/auth/permissions';

describe('V7.9.1 stabilization', () => {
  it('projects only directory-safe worker fields', () => {
    const projected = workerDirectoryEntry({
      id:'w1', personId:'p1', employeeNumber:'SECRET-1', displayName:'Employee One', workEmail:'one@example.test',
      status:'active', hireDate:'2026-01-01', createdAt:'x', updatedAt:'y'
    });
    expect(projected).toEqual({id:'w1',displayName:'Employee One',workEmail:'one@example.test',status:'active',updatedAt:'y'});
    expect(projected).not.toHaveProperty('employeeNumber');
    expect(projected).not.toHaveProperty('personId');
    expect(projected).not.toHaveProperty('hireDate');
  });
  it('gives managers team-scoped rather than organization-wide manage permissions', () => {
    const perms=permissionsForRole('manager');
    expect(perms).toContain('recruiting.manage.team');
    expect(perms).toContain('onboarding.manage.team');
    expect(perms).toContain('time.manage.team');
    expect(perms).toContain('performance.pip.team');
    expect(perms).toContain('learning.verify.team');
    expect(perms).not.toContain('recruiting.manage');
    expect(perms).not.toContain('onboarding.manage');
    expect(perms).not.toContain('time.manage');
    expect(perms).not.toContain('performance.pip');
    expect(perms).not.toContain('learning.verify');
  });
});
