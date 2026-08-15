import { describe, expect, it } from 'vitest';
import { firstOrganizationSetupSchema, organizationIdFromName } from '@/lib/organization/bootstrap';

describe('first organization bootstrap helpers', () => {
  it('validates normalized setup input', () => {
    const result = firstOrganizationSetupSchema.parse({ organizationName:'  Acme Canada  ', firstName:' Ada ', lastName:' Lovelace ' });
    expect(result).toEqual({ organizationName:'Acme Canada', firstName:'Ada', lastName:'Lovelace' });
  });

  it('creates deterministic safe organization ids when entropy is supplied', () => {
    const a=organizationIdFromName('Élan People & Culture','entropy');
    const b=organizationIdFromName('Élan People & Culture','entropy');
    expect(a).toBe(b);
    expect(a).toMatch(/^elan-people-culture-[a-f0-9]{10}$/);
  });
});
