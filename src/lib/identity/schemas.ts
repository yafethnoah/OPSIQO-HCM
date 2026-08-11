import { z } from 'zod';
const code=z.string().min(2).max(100).regex(/^[A-Z0-9._-]+$/).transform(v=>v.toUpperCase());
const role=z.enum(['super_admin','org_admin','hr_admin','hr_partner','manager','employee']);
const lifecycleAction=z.discriminatedUnion('action',[
 z.object({action:z.enum(['submit_review','approve','activate','pause','retire','reopen'])}),
]);
export const providerCreateSchema=z.object({
 code,name:z.string().min(3).max(250),vendor:z.enum(['microsoft_entra','google_workspace','generic']),protocol:z.enum(['oidc','saml']),
 firebaseProviderId:z.string().regex(/^(oidc|saml)\.[A-Za-z0-9._-]+$/),issuerUrl:z.string().url().optional(),metadataUrl:z.string().url().optional(),
 deploymentConfigRef:z.string().min(5).max(500).regex(/^firebase-auth\/[A-Za-z0-9._-]+$/),allowedEmailDomains:z.array(z.string().min(3).max(253).transform(v=>v.toLowerCase())).min(1).max(50),
 jitMode:z.enum(['disabled','employee_only','request_only']).default('request_only'),mfaRequired:z.boolean().default(true),managedDeviceClaimRequired:z.boolean().default(false)
}).superRefine((v,ctx)=>{if(v.protocol==='oidc'&&!v.issuerUrl)ctx.addIssue({code:'custom',path:['issuerUrl'],message:'OIDC providers require issuerUrl.'});if(v.protocol==='saml'&&!v.metadataUrl)ctx.addIssue({code:'custom',path:['metadataUrl'],message:'SAML providers require metadataUrl.'});if(!v.firebaseProviderId.startsWith(`${v.protocol}.`))ctx.addIssue({code:'custom',path:['firebaseProviderId'],message:'Firebase provider id must match protocol.'});});
export const providerActionSchema=lifecycleAction;
export const mappingCreateSchema=z.object({code,providerId:z.string().uuid(),claimType:z.enum(['email_domain','group']),claimValue:z.string().min(1).max(500),role,autoJitEligible:z.boolean().default(false)}).superRefine((v,ctx)=>{if(v.autoJitEligible&&v.role!=='employee')ctx.addIssue({code:'custom',path:['autoJitEligible'],message:'Automatic JIT is restricted to the employee role.'});});
export const mappingActionSchema=lifecycleAction;
export const accessRequestCreateSchema=z.object({source:z.enum(['manual','deprovision']).default('manual'),changeType:z.enum(['grant_membership','change_role','disable_membership','reactivate_membership']),targetUid:z.string().min(3).max(200),workerId:z.string().min(1).max(200),requestedRole:role.optional(),reason:z.string().min(20).max(5000)}).superRefine((v,ctx)=>{if(['grant_membership','change_role'].includes(v.changeType)&&!v.requestedRole)ctx.addIssue({code:'custom',path:['requestedRole'],message:'Requested role is required.'});});
export const accessRequestActionSchema=z.discriminatedUnion('action',[z.object({action:z.enum(['submit_review','approve','execute'])}),z.object({action:z.literal('reject'),note:z.string().min(10).max(2000)})]);
export const accessReviewCreateSchema=z.object({code,name:z.string().min(3).max(250),scope:z.enum(['all','privileged']).default('privileged'),dueDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)});
export const accessReviewActionSchema=z.discriminatedUnion('action',[z.object({action:z.enum(['submit_review','approve','launch','close'])})]);
export const accessReviewItemActionSchema=z.object({decision:z.enum(['retain','revoke','escalate']),rationale:z.string().min(15).max(3000)});
export const identityAccountSyncSchema=z.object({providerId:z.string().uuid(),externalSubject:z.string().min(1).max(1000),workEmail:z.string().email(),active:z.boolean(),groups:z.array(z.string().max(500)).max(100).default([]),mfaVerified:z.boolean().optional(),deviceCompliant:z.boolean().optional()});
export const provisioningCreateSchema=z.object({workerId:z.string().min(1).max(200),profileId:z.string().uuid(),action:z.enum(['create','update','disable']),rationale:z.string().min(20).max(5000)});
export const provisioningActionSchema=z.discriminatedUnion('action',[z.object({action:z.enum(['submit_review','approve','execute'])}),z.object({action:z.literal('reject'),note:z.string().min(10).max(2000)})]);
