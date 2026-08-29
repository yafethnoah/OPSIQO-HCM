import { describe, expect, it } from 'vitest';
import { createTenantSchema } from '@/lib/platform/tenant-management';

describe('H37 platform tenant management',()=>{
  it('normalizes and validates governed tenant creation input',()=>{
    expect(createTenantSchema.parse({organizationName:'  Kris Atelier Test  ',administratorFirstName:' Shadi ',administratorLastName:' Admin ',environment:'test',reason:'Create an isolated UAT company.'})).toEqual({organizationName:'Kris Atelier Test',administratorFirstName:'Shadi',administratorLastName:'Admin',environment:'test',reason:'Create an isolated UAT company.'});
  });
  it('rejects an undocumented creation request',()=>{
    expect(()=>createTenantSchema.parse({organizationName:'Test',administratorFirstName:'A',administratorLastName:'B',environment:'test',reason:'short'})).toThrow();
  });
  it('rejects an unsupported environment',()=>{
    expect(()=>createTenantSchema.parse({organizationName:'Test',administratorFirstName:'A',administratorLastName:'B',environment:'sandbox',reason:'A documented platform reason.'})).toThrow();
  });
});
