import { describe,expect,it } from 'vitest';
import { CONTRACT_FIELD_KEYS } from '@/domain/contract-import';
import { contractExtractionSchema,confirmContractSchema,MAX_CONTRACT_BYTES } from '@/lib/contract-import/schemas';
import { extractRtfText } from '@/lib/contract-import/docx';
const emptyFields=Object.fromEntries(CONTRACT_FIELD_KEYS.map(k=>[k,{value:null,confidence:0,sourceSnippet:null}]));
describe('governed contract import',()=>{
 it('defines a complete structured HR extraction surface',()=>{expect(CONTRACT_FIELD_KEYS).toContain('employeeName');expect(CONTRACT_FIELD_KEYS).toContain('jobTitle');expect(CONTRACT_FIELD_KEYS).toContain('basePay');expect(CONTRACT_FIELD_KEYS).toContain('terminationNotice');expect(CONTRACT_FIELD_KEYS.length).toBeGreaterThan(25);});
 it('rejects unknown confirmation fields and requires explicit review',()=>{expect(()=>confirmContractSchema.parse({reviewed:true,values:{madeUpField:'x'}})).toThrow();expect(()=>confirmContractSchema.parse({reviewed:false,values:{}})).toThrow();expect(confirmContractSchema.parse({reviewed:true,values:{jobTitle:'HR Manager'}}).values.jobTitle).toBe('HR Manager');});
 it('validates structured extraction confidence and contract envelope',()=>{const parsed=contractExtractionSchema.parse({documentType:'employment_agreement',language:'en',summary:'',fields:emptyFields,warnings:[]});expect(parsed.fields.employeeName.value).toBeNull();expect(()=>contractExtractionSchema.parse({...parsed,fields:{...emptyFields,basePay:{value:'$1',confidence:2,sourceSnippet:'salary'}}})).toThrow();});
 it('keeps the upload limit bounded to 10 MB',()=>{expect(MAX_CONTRACT_BYTES).toBe(10*1024*1024);});
 it('extracts readable text from basic RTF',()=>{expect(extractRtfText(Buffer.from('{\\rtf1\\ansi Employee Name: Jane Doe\\par Job Title: Manager}')).toLowerCase()).toContain('jane doe');});
});
