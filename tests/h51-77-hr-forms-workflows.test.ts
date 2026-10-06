import { describe, expect, it } from 'vitest';
import { conditionMatches, validateSubmission, scoreSubmission } from '@/modules/hr-forms-workflows';
import { buildSimpleDocx } from '@/lib/hr-forms-workflows/docx';
import type { HRFormTemplate } from '@/modules/hr-forms-workflows';

describe('H51.77 HR Forms & Workflows integration',()=>{
  it('preserves conditional form logic',()=>{
    expect(conditionMatches({id:'c1',sourceFieldId:'workerType',operator:'equals',value:'contractor',action:'show_field',targetId:'contractorTerms'},{workerType:'contractor'})).toBe(true);
  });
  it('validates and scores structured fields',()=>{
    const t={id:'t',organizationId:'o',formCode:'INT-X',title:'Interview',category:'Recruitment',status:'published',version:'1.0',sensitivity:'confidential',aiGenerated:false,createdBy:'u',createdAt:'x',updatedBy:'u',updatedAt:'x',fields:[{id:'score',kind:'scale_1_5',label:'Score',required:true,scoring:{enabled:true,min:1,max:5,weight:100}}]} as HRFormTemplate;
    expect(validateSubmission(t,{score:5})).toEqual([]);
    expect(Math.round(scoreSubmission(t,{score:5}).weightedTotal||0)).toBe(100);
  });
  it('produces a real DOCX ZIP container',()=>{
    const b=buildSimpleDocx({title:'Test HR Form',lines:[{label:'Employee',value:'Example'}]});
    expect(String.fromCharCode(b[0]!,b[1]!)).toBe('PK');
    expect(b.length).toBeGreaterThan(500);
  });
});
