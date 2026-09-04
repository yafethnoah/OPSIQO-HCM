import { randomUUID } from 'crypto';
import { z } from 'zod';
import type { ActorContext, Permission } from '@/domain/security';
import type { CortexAgentDefinition } from '@/domain/opsiqo-one';
import type { AgentBuilderDashboard, CustomAgentDefinition } from '@/domain/opsiqo-one-v7-13';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';
import { allCortexAgents } from './cortex';

const now=()=>new Date().toISOString();
const permittedScopes=['self.read','team.read','people.read.directory','recruiting.read','onboarding.read','learning.read','career.read','performance.read','compensation.read','workforce.read','policies.read','compliance.read','service.read','workflow.read','peopleanalytics.read','strategy.read','commandcenter.read','governance.read','regulatory.read'] as const;
const schema=z.object({
 name:z.string().trim().min(3).max(100),purpose:z.string().trim().min(10).max(500),instructions:z.string().trim().min(20).max(4000),
 capabilities:z.array(z.string().trim().min(2).max(100)).min(1).max(12),keywords:z.array(z.string().trim().min(2).max(50)).min(1).max(20),
 requiredAnyPermissions:z.array(z.enum(permittedScopes)).min(1).max(8),maxActionLevel:z.enum(['observe','recommend','prepare']).default('recommend'),
});
const actionSchema=z.object({action:z.enum(['submit_review','activate','retire'])});
function requireManage(a:ActorContext){if(!a.permissions.includes('ai.manage'))throw new ApiError(403,'AI governance management permission required.','forbidden');}
function requireApprove(a:ActorContext){if(!a.permissions.includes('ai.approve'))throw new ApiError(403,'Independent AI approval permission required.','forbidden');}
const slug=(v:string)=>v.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,36)||'agent';

export async function listCustomAgents(actor:ActorContext):Promise<AgentBuilderDashboard>{
 if(!actor.permissions.includes('ai.manage')&&!actor.permissions.includes('ai.audit'))throw new ApiError(403,'AI governance access required.','forbidden');
 const snap=await adminDb().collection(`organizations/${actor.orgId}/aiAgentDefinitions`).orderBy('updatedAt','desc').limit(100).get();
 return{agents:snap.docs.map(d=>d.data() as CustomAgentDefinition),canManage:actor.permissions.includes('ai.manage'),canApprove:actor.permissions.includes('ai.approve'),safetyNotice:'Custom agents are configuration and orchestration helpers. Their hard authority ceiling is Prepare; they cannot gain Execute authority or bypass existing domain permissions, approvals, MFA, audit, or consequential-employment controls.'};
}

export async function createCustomAgent(actor:ActorContext,raw:unknown):Promise<CustomAgentDefinition>{
 requireManage(actor);const input=schema.parse(raw);const reserved=new Set(allCortexAgents().map(x=>x.id));let id=`custom-${slug(input.name)}-${randomUUID().slice(0,8)}`;while(reserved.has(id))id=`custom-${slug(input.name)}-${randomUUID().slice(0,8)}`;
 const timestamp=now(),row:CustomAgentDefinition={id,...input,capabilities:[...new Set(input.capabilities)],keywords:[...new Set(input.keywords.map(x=>x.toLowerCase()))],requiredAnyPermissions:[...new Set(input.requiredAnyPermissions)],hardMaxActionLevel:'prepare',humanOversight:true,status:'draft',createdBy:actor.uid,createdAt:timestamp,updatedBy:actor.uid,updatedAt:timestamp};
 const db=adminDb(),audit=buildAudit(actor,{action:'ai.custom_agent.create',entityType:'aiAgentDefinition',entityId:id,after:{...row,instructions:'[governed instructions stored]'}}),b=db.batch();b.create(db.doc(`organizations/${actor.orgId}/aiAgentDefinitions/${id}`),row);b.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);await b.commit();return row;
}

export async function actCustomAgent(actor:ActorContext,id:string,raw:unknown):Promise<CustomAgentDefinition>{
 const{action}=actionSchema.parse(raw),db=adminDb(),ref=db.doc(`organizations/${actor.orgId}/aiAgentDefinitions/${id}`),snap=await ref.get();if(!snap.exists)throw new ApiError(404,'Custom agent not found.','custom_agent_not_found');const before=snap.data() as CustomAgentDefinition,timestamp=now();let patch:Partial<CustomAgentDefinition>={updatedBy:actor.uid,updatedAt:timestamp};
 if(action==='submit_review'){requireManage(actor);if(before.status!=='draft')throw new ApiError(409,'Only draft agents can be submitted for review.','invalid_custom_agent_state');patch={...patch,status:'in_review',submittedAt:timestamp};}
 if(action==='activate'){requireApprove(actor);if(before.status!=='in_review')throw new ApiError(409,'Only reviewed agents can be activated.','invalid_custom_agent_state');if(before.createdBy===actor.uid)throw new ApiError(409,'Custom agent activation requires an independent approver.','custom_agent_self_approval');patch={...patch,status:'active',activatedBy:actor.uid,activatedAt:timestamp};}
 if(action==='retire'){requireManage(actor);if(before.status==='retired')return before;patch={...patch,status:'retired',retiredBy:actor.uid,retiredAt:timestamp};}
 const after={...before,...patch} as CustomAgentDefinition,audit=buildAudit(actor,{action:`ai.custom_agent.${action}`,entityType:'aiAgentDefinition',entityId:id,before:{...before,instructions:'[governed instructions stored]'},after:{...after,instructions:'[governed instructions stored]'}}),b=db.batch();b.set(ref,patch,{merge:true});b.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);await b.commit();return after;
}

export async function activeCustomCortexAgents(actor:ActorContext):Promise<CortexAgentDefinition[]>{
 const snap=await adminDb().collection(`organizations/${actor.orgId}/aiAgentDefinitions`).where('status','==','active').limit(50).get();
 return snap.docs.map(d=>d.data() as CustomAgentDefinition).filter(x=>actor.permissions.includes('ai.manage')||x.requiredAnyPermissions.some(p=>actor.permissions.includes(p as Permission))).map(x=>({id:x.id,name:x.name,purpose:x.purpose,capabilities:[...x.capabilities],requiredAnyPermissions:[...x.requiredAnyPermissions],maxActionLevel:x.maxActionLevel,humanOversight:true}));
}

export async function activeCustomAgentDefinitions(actor:ActorContext):Promise<CustomAgentDefinition[]>{
 const snap=await adminDb().collection(`organizations/${actor.orgId}/aiAgentDefinitions`).where('status','==','active').limit(50).get();
 // Orchestration never inherits AI-administrator visibility as domain authority.
 // A custom agent participates only when the caller independently holds at least
 // one of the agent's declared evidence permissions. Governance UIs use
 // activeCustomCortexAgents(), which may expose all agents to ai.manage actors.
 return snap.docs.map(d=>d.data() as CustomAgentDefinition).filter(x=>x.requiredAnyPermissions.some(p=>actor.permissions.includes(p as Permission)));
}
