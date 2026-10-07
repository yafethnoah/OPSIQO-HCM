import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { deletePlatformTenantSchema, platformTenantLifecycleSchema } from '@/lib/platform/tenant-management';

describe('H51.81 governed organization lifecycle',()=>{
  it('requires a meaningful lifecycle reason',()=>{
    expect(platformTenantLifecycleSchema.safeParse({action:'deactivate',reason:'short'}).success).toBe(false);
    expect(platformTenantLifecycleSchema.safeParse({action:'deactivate',reason:'Retire this test tenant after UAT completion.'}).success).toBe(true);
  });

  it('requires a meaningful permanent deletion request',()=>{
    expect(deletePlatformTenantSchema.safeParse({organizationName:'Demo',reason:'short'}).success).toBe(false);
    expect(deletePlatformTenantSchema.safeParse({organizationName:'Demo',reason:'Duplicate test organization no longer required.'}).success).toBe(true);
  });

  it('keeps the destructive flow fail-closed in source',()=>{
    const service=fs.readFileSync('src/lib/platform/tenant-management.ts','utf8');
    expect(service).toContain("target.status!=='inactive'");
    expect(service).toContain("input.organizationName!==target.name");
    expect(service).toContain("DELETE PRODUCTION");
    expect(service).toContain('protectCurrentOrganization(actor,targetOrgId)');
    expect(service).toContain('db.recursiveDelete(target.ref)');
  });
});
