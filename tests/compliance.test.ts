import { describe, expect, it } from 'vitest';
import { acknowledgementSchema, complianceRequirementSchema, documentMetadataSchema, policyCreateSchema, retentionRuleSchema } from '../src/lib/compliance/schemas';

describe('Phase 2 v0.7 compliance schemas',()=>{
  it('requires a document category when a compliance requirement is document-based',()=>{
    expect(()=>complianceRequirementSchema.parse({name:'Government ID',requirementType:'document',required:true,appliesTo:'all_employees',orgUnitIds:[],employmentTypes:[],expiryWarningDays:30})).toThrow();
  });
  it('requires a policy id for policy acknowledgement requirements',()=>{
    expect(()=>complianceRequirementSchema.parse({name:'Conduct acknowledgement',requirementType:'policy_ack',required:true,appliesTo:'all_employees',orgUnitIds:[],employmentTypes:[],expiryWarningDays:30})).toThrow();
  });
  it('rejects empty acknowledgement confirmation',()=>{
    expect(()=>acknowledgementSchema.parse({signerName:'Taylor Chen',confirm:false})).toThrow();
  });
  it('caps retention rules at 100 years and requires a basis note',()=>{
    expect(()=>retentionRuleSchema.parse({name:'Bad rule',category:'employment',trigger:'document_created',retentionDays:50000,action:'review',legalBasisNote:'x',enabled:true})).toThrow();
  });
  it('accepts governed policy and employee document metadata',()=>{
    expect(policyCreateSchema.parse({code:'HR-001',title:'Workplace Conduct',content:'This policy contains sufficient controlled policy content for testing.',versionLabel:'1.0',effectiveDate:'2026-08-10',acknowledgementRequired:true,onboardingRequired:true,audience:'all_employees',audienceOrgUnitIds:[],audienceEmploymentTypes:[],reviewFrequencyMonths:12}).code).toBe('HR-001');
    expect(documentMetadataSchema.parse({workerId:'worker-1',title:'Employment agreement',category:'employment',classification:'confidential',issueDate:'',expiryDate:'',retentionRuleId:''}).workerId).toBe('worker-1');
  });
});

import { workflowDefinitionCreateSchema } from '../src/lib/workflow/schemas';

describe('Phase 2 v0.7 governance automation triggers',()=>{
  it('accepts policy review due as a workflow trigger',()=>{
    const row=workflowDefinitionCreateSchema.parse({name:'Annual policy review',trigger:'policy.review_due',enabled:true,steps:[{id:'review',name:'Review policy',type:'task',ownerRole:'hr_admin',dependsOn:[]}]});
    expect(row.trigger).toBe('policy.review_due');
  });
});
