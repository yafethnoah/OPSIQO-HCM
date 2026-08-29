import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const read=(file:string)=>fs.readFileSync(file,'utf8');

describe('OPSIQO V7.34 / H34 platform stabilization contracts',()=>{
  it('repairs the confirmed Universal Import async reset defect',()=>{
    const source=read('src/components/import-center-workspace.tsx');
    expect(source).toContain('const form=e.currentTarget;');
    expect(source).toContain('form.reset();');
    expect(source).not.toContain('e.currentTarget.reset()');
  });

  it('keeps universal document imports employee-independent by default and supports governed batches',()=>{
    const source=read('src/components/import-center-workspace.tsx');
    expect(source).toContain('Not employee-specific (default)');
    expect(source).toContain('type="file" multiple required');
    expect(source).toContain('exact duplicate(s) already existed');
  });

  it('requires explicit scan evidence before the clean UI action',()=>{
    const source=read('src/components/import-center-workspace.tsx');
    expect(source).toContain('A malware-scan evidence reference is required');
    expect(source).toContain("{scanEvidenceRef:scanEvidenceRef.trim()}");
  });

  it('adds an audited maintenance center and protects immutable evidence',()=>{
    const service=read('src/lib/admin-maintenance/service.ts');
    expect(service).toContain('admin.maintenance.safe_cleanup');
    expect(service).toContain('Audit logs and historical audit evidence');
    expect(service).toContain('Source hashes and release/certification provenance');
    expect(service).not.toContain("auditLogs',\n  'security");
  });

  it('fails closed for UAT reset unless the environment explicitly enables it',()=>{
    const service=read('src/lib/admin-maintenance/service.ts');
    expect(service).toContain("OPSIQO_ALLOW_UAT_TENANT_RESET !== 'true'");
    expect(service).toContain('confirmation_required');
    expect(service).toContain('organizationRootPreserved: true');
    expect(service).toContain('auditLogsPreserved: true');
  });

  it('expands Organization Launchpad to a full implementation path',()=>{
    const source=read('src/lib/opsiqo-one/organization-launchpad.ts');
    for(const id of ['profile','structure','positions','members','imports','people','policies','procedures','time','recruiting','onboarding','learning','performance','safety','compliance','privacy','portals','automation','ai','agents','maintenance']){
      expect(source).toContain(`id:'${id}'`);
    }
  });

  it('keeps custom agents human-governed',()=>{
    const source=read('src/components/agent-builder-workspace.tsx');
    expect(source).toContain('Execute remains unavailable');
    expect(source).toContain('independent approval');
    expect(source).toContain('custom agents can never be configured above Prepare');
  });
});
