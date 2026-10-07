import { describe, expect, it } from 'vitest';
import { buildFillablePdfPack } from '@/lib/documents/fillable-pdf';
import { buildSimpleDocx } from '@/lib/hr-forms-workflows/docx';
import { packActionSchema, packStartSchema } from '@/lib/hr-forms-workflows/studio-schemas';

describe('H51.80 operational forms and pack workspace',()=>{
  it('validates strict pack lifecycle actions',()=>{
    expect(packActionSchema.parse({action:'submit_review'}).action).toBe('submit_review');
    expect(()=>packActionSchema.parse({action:'publish_now'})).toThrow();
  });
  it('accepts optional governed pack assignment target',()=>{
    expect(packStartSchema.parse({workerId:'worker-1'}).workerId).toBe('worker-1');
  });
  it('creates a multi-document fillable PDF with a cover/index',()=>{
    const bytes=buildFillablePdfPack({
      title:'Onboarding Form Pack',
      brand:{companyName:'Example Organization',primaryColor:'#1F3A5F',accentColor:'#1ABCBC'},
      documents:[
        {title:'Employee Information Form',documentReference:'HR-EMP-2026-001',content:'# Employee Information Form\nName:\nStart date:'},
        {title:'Emergency Contact Form',documentReference:'HR-EMG-2026-001',content:'# Emergency Contact Form\nContact name:\nPhone:'},
      ]
    });
    expect(String.fromCharCode(bytes[0]!,bytes[1]!,bytes[2]!,bytes[3]!)).toBe('%PDF');
    expect(bytes.length).toBeGreaterThan(1000);
  });
  it('supports DOCX page breaks for pack documents',()=>{
    const bytes=buildSimpleDocx({title:'Pack',lines:[{value:'Index'},{value:'[[PAGE_BREAK]]'},{value:'Document 1'}]});
    const text=new TextDecoder().decode(bytes);
    expect(text).toContain('w:type="page"');
  });
});
