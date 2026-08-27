import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
const read=(p:string)=>fs.readFileSync(p,'utf8');

describe('OPSIQO V7.32 H33 inline import master data',()=>{
  it('allows explicit inline org-unit creation with prefilled source values',()=>{
    const ui=read('src/components/employee-import-panel.tsx');
    expect(ui).toContain('+ Create organizational unit');
    expect(ui).toContain('Create & select');
    expect(ui).toContain('Possible existing matches');
    expect(ui).toContain('/org-units');
  });

  it('allows explicit inline position creation in the selected unit',()=>{
    const ui=read('src/components/employee-import-panel.tsx');
    expect(ui).toContain('+ Create position');
    expect(ui).toContain('Headcount capacity');
    expect(ui).toContain('/positions');
    expect(ui).toContain("status:'open'");
  });

  it('immediately revalidates after master-data creation',()=>{
    const ui=read('src/components/employee-import-panel.tsx');
    expect(ui).toContain('await saveCorrection(nextDraft)');
  });

  it('preserves permission-gated structural APIs',()=>{
    expect(read('src/app/api/organizations/[orgId]/org-units/route.ts')).toContain("requirePermission(actor, 'organization.manage')");
    expect(read('src/app/api/organizations/[orgId]/positions/route.ts')).toContain("requirePermission(actor, 'positions.manage')");
  });

  it('preserves H31 idempotence and H32 row-derived import gate',()=>{
    expect(read('src/lib/data-import/employee-import.ts')).toContain('r.errors=[...new Set(r.errors||[])]');
    expect(read('src/components/employee-import-panel.tsx')).toContain('reviewCounts.blockedCount');
  });
});