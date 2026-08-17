import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const setup = readFileSync('src/app/setup/page.tsx', 'utf8');

describe('first organization bootstrap client context', () => {
  it('discovers memberships without requiring an active organization', () => {
    expect(setup).toContain(
      "apiFetch<{data:ExistingOrg[]}>('/api/me/organizations', { orgContext:'omit' })",
    );
  });

  it('creates the first organization without requiring a pre-existing organization', () => {
    const marker = "apiFetch<SetupResult>('/api/setup'";
    const start = setup.indexOf(marker);

    expect(start).toBeGreaterThanOrEqual(0);

    const call = setup.slice(start, start + 350);

    expect(call).toContain("orgContext:'omit'");
  });
});