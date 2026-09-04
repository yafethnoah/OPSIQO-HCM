import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const read=(path:string)=>fs.readFileSync(path,'utf8');

describe('OPSIQO V7.32 H32 employee import counter integrity',()=>{
  it('derives ready and review counts from authoritative row validation state',()=>{
    const ui=read('src/components/employee-import-panel.tsx');
    expect(ui).toContain("const readyCount=preview.rows.filter(row=>(row.errors||[]).length===0).length");
    expect(ui).toContain("const blockedCount=preview.rows.length-readyCount");
    expect(ui).toContain("data-testid=\"employee-import-ready-count\"");
    expect(ui).toContain("data-testid=\"employee-import-review-count\"");
  });

  it('does not use server summary counters as the client import gate',()=>{
    const ui=read('src/components/employee-import-panel.tsx');
    expect(ui).toContain("if(!preview||reviewCounts.blockedCount)return;");
    expect(ui).toContain("disabled={reviewCounts.blockedCount>0||busy==='commit'}");
    expect(ui).toContain("`Complete ${reviewCounts.blockedCount} row(s) before import`");
    expect(ui).toContain("`Import ${reviewCounts.readyCount} reviewed employee(s)`");
  });

  it('detects and surfaces a server/client summary mismatch without weakening server authority',()=>{
    const ui=read('src/components/employee-import-panel.tsx');
    expect(ui).toContain("serverMismatch:readyCount!==preview.readyCount||blockedCount!==preview.blockedCount");
    expect(ui).toContain("Review summary synchronized.");
    expect(ui).toContain("Save & revalidate");
  });

  it('preserves H31 server-side revalidation and final commit protection',()=>{
    const service=read('src/lib/data-import/employee-import.ts');
    expect(service).toContain("r.errors=[...new Set(r.errors||[])]");
    expect(service).toContain("if(p.blockedCount>0)throw new ApiError");
    expect(service).toContain("const validated=validateRows(nextRows,ctx)");
  });
});