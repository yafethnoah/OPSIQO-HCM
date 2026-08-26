import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const read=(path:string)=>fs.readFileSync(path,'utf8');

describe('OPSIQO V7.32 H31 import revalidation idempotence',()=>{
  it('does not carry ordinary validation failures into the next review pass',()=>{
    const service=read('src/lib/data-import/employee-import.ts');
    expect(service).toContain('errors:retainedReviewErrors(d)');
    expect(service).toContain('warnings:retainedReviewWarnings(d)');
    expect(service).not.toContain("errors:[...(d.errors||[])],warnings:[...(d.warnings||[])]");
  });

  it('preserves unresolved governed reconciliation evidence only while unresolved',()=>{
    const service=read('src/lib/data-import/employee-import.ts');
    expect(service).toContain("!reviewed.has('orgUnitId')");
    expect(service).toContain("message.startsWith('Organization unit match is ambiguous:')");
    expect(service).toContain("message.endsWith(' by governed alias.')");
  });

  it('deduplicates every validation and warning set before preview persistence',()=>{
    const service=read('src/lib/data-import/employee-import.ts');
    expect(service).toContain('r.errors=[...new Set(r.errors||[])]');
    expect(service).toContain('r.warnings=[...new Set(r.warnings||[])]');
  });

  it('keeps H30 server-authoritative correction and revalidation behavior',()=>{
    const service=read('src/lib/data-import/employee-import.ts');
    expect(service).toContain('updateEmployeeImportPreviewRow');
    expect(service).toContain('const validated=validateRows(nextRows,ctx)');
    expect(service).toContain("action:'employee.import.preview.correct'");
  });
});