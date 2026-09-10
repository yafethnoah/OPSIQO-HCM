import { describe,expect,it } from 'vitest';
import fs from 'node:fs';
import { runtimeUiTranslation } from '@/lib/opsiqo-one/runtime-ui-i18n';

const read=(p:string)=>fs.readFileSync(p,'utf8');

describe('OPSIQO V7.32 H26 UAT runtime closure',()=>{
  it('localizes contract-import runtime strings in Arabic',()=>{
    expect(runtimeUiTranslation('Contract Import','ar')).toBe('استيراد العقد');
    expect(runtimeUiTranslation('Choose contract','ar')).toContain('العقد');
    expect(runtimeUiTranslation('Ask OPSIQO or tell it what to do…','ar')).toContain('اسأل');
  });

  it('localizes governed org-unit alias messages',()=>{
    const translated=runtimeUiTranslation('Organization unit "Human Resources" mapped to "People & Culture" by governed alias.','ar');
    expect(translated).toContain('Human Resources');
    expect(translated).toContain('People & Culture');
    expect(translated).toContain('تمت مطابقة');
  });

  it('provides deterministic text-based PDF fallback without weakening scanned-PDF governance',()=>{
    const service=read('src/lib/contract-import/service.ts');
    expect(service).toContain('extractPdfDocument');
    expect(service).not.toContain('text&&text.trim().length>=40');
    expect(service).toContain("new ApiError(422,'Scanned PDF contract parsing requires");
  });

  it('keeps organization-unit reconciliation governed and non-silent',()=>{
    const service=read('src/lib/data-import/employee-import.ts');
    expect(service).toContain('ORG_UNIT_FAMILIES');
    expect(service).toContain('aliasMatches.length===1');
    expect(service).toContain('Organization unit match is ambiguous');
    expect(service).toContain('mapped to');
  });
});
