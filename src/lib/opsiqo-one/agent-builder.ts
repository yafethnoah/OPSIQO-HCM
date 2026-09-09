import { createHash, randomUUID } from 'crypto';
import { z } from 'zod';
import type { ActorContext, Permission } from '@/domain/security';
import type { CortexAgentDefinition } from '@/domain/opsiqo-one';
import type {
  AgentBuilderDashboard,
  AgentSystemRecordHistory,
  CustomAgentDefinition,
  CustomAgentExecutionRecord,
  CustomAgentSimulationRecord,
  CustomAgentVersion,
  RegisteredCustomAgentDefinition,
} from '@/domain/opsiqo-one-v7-13';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';
import { allCortexAgents } from './cortex';

const now=()=>new Date().toISOString();
const permittedScopes=['self.read','team.read','people.read.directory','recruiting.read','onboarding.read','learning.read','career.read','performance.read','compensation.read','workforce.read','policies.read','compliance.read','service.read','workflow.read','peopleanalytics.read','strategy.read','commandcenter.read','governance.read','regulatory.read'] as const;
const toolIds=['organizational_memory.search','policy.search','knowledge.search','workflow.inspect','learning.inspect','analytics.read','document.prepare','case.prepare','notification.prepare'] as const;
const actionTypes=['observe','recommend','prepare_document','prepare_workflow','prepare_case_update','prepare_notification'] as const;
const triggerModes=['manual','event_detected','scheduled_review'] as const;
const contextSources=['organizational_memory','policy','knowledge_article','workflow','learning_course','recruiting','onboarding','performance','compensation','workforce','analytics'] as const;

const definitionSchema=z.object({
  name:z.string().trim().min(3).max(100),
  purpose:z.string().trim().min(10).max(500),
  instructions:z.string().trim().min(20).max(4000),
  capabilities:z.array(z.string().trim().min(2).max(100)).min(1).max(12),
  keywords:z.array(z.string().trim().min(2).max(50)).min(1).max(20),
  requiredAnyPermissions:z.array(z.enum(permittedScopes)).min(1).max(8),
  maxActionLevel:z.enum(['observe','recommend','prepare']).default('recommend'),
  autonomyLevel:z.enum(['assistive','supervised_prepare']).default('assistive'),
  allowedTools:z.array(z.enum(toolIds)).min(1).max(toolIds.length).default(['organizational_memory.search']),
  allowedActionTypes:z.array(z.enum(actionTypes)).min(1).max(actionTypes.length).default(['recommend']),
  triggerModes:z.array(z.enum(triggerModes)).min(1).max(triggerModes.length).default(['manual']),
  contextSources:z.array(z.enum(contextSources)).min(1).max(contextSources.length).default(['organizational_memory']),
  evidenceRequirements:z.array(z.string().trim().min(3).max(240)).min(1).max(12).default(['Use permission-scoped governed evidence before preparing output.']),
});
const createSchema=definitionSchema.extend({stewardUid:z.string().trim().min(3).max(200).optional()});
const actionSchema=z.discriminatedUnion('action',[
  z.object({action:z.literal('simulate')}),
  z.object({action:z.literal('submit_review')}),
  z.object({action:z.literal('activate')}),
  z.object({action:z.literal('retire')}),
  z.object({action:z.literal('revise'),definition:definitionSchema}),
]);
type DefinitionInput=z.infer<typeof definitionSchema>;

function requireManage(a:ActorContext){if(!a.permissions.includes('ai.manage'))throw new ApiError(403,'AI governance management permission required.','forbidden');}
function requireApprove(a:ActorContext){if(!a.permissions.includes('ai.approve'))throw new ApiError(403,'Independent AI approval permission required.','forbidden');}
function requireRead(a:ActorContext){if(!a.permissions.includes('ai.manage')&&!a.permissions.includes('ai.audit'))throw new ApiError(403,'AI governance access required.','forbidden');}
const slug=(v:string)=>v.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,36)||'agent';
const unique=(values:string[])=>[...new Set(values.map(x=>x.trim()).filter(Boolean))];

function normalizedDefinition(input:DefinitionInput):DefinitionInput{
  return {...input,capabilities:unique(input.capabilities),keywords:unique(input.keywords.map(x=>x.toLowerCase())),requiredAnyPermissions:unique(input.requiredAnyPermissions) as DefinitionInput['requiredAnyPermissions'],allowedTools:unique(input.allowedTools) as DefinitionInput['allowedTools'],allowedActionTypes:unique(input.allowedActionTypes) as DefinitionInput['allowedActionTypes'],triggerModes:unique(input.triggerModes) as DefinitionInput['triggerModes'],contextSources:unique(input.contextSources) as DefinitionInput['contextSources'],evidenceRequirements:unique(input.evidenceRequirements)};
}

function normalizeAgent(raw:CustomAgentDefinition):RegisteredCustomAgentDefinition{
  const legacy=!raw.currentVersionId;
  return {
    ...raw,
    ownerUid:raw.ownerUid||raw.createdBy,
    stewardUid:raw.stewardUid||raw.createdBy,
    autonomyLevel:raw.autonomyLevel||'assistive',
    allowedTools:raw.allowedTools?.length?raw.allowedTools:['organizational_memory.search'],
    allowedActionTypes:raw.allowedActionTypes?.length?raw.allowedActionTypes:['recommend'],
    triggerModes:raw.triggerModes?.length?raw.triggerModes:['manual'],
    contextSources:raw.contextSources?.length?raw.contextSources:['organizational_memory'],
    evidenceRequirements:raw.evidenceRequirements?.length?raw.evidenceRequirements:['Use permission-scoped governed evidence before preparing output.'],
    requiresHumanApprovalForConsequentialActions:true,
    executionAuthority:'none',
    currentVersion:raw.currentVersion||1,
    currentVersionId:raw.currentVersionId||'legacy-unversioned',
    systemRecordState:legacy?'legacy_unversioned':'versioned',
    latestSimulationStatus:raw.latestSimulationStatus||'not_run',
  } as RegisteredCustomAgentDefinition;
}

function definitionFromAgent(agent:RegisteredCustomAgentDefinition):DefinitionInput{
  return normalizedDefinition({
    name:agent.name,purpose:agent.purpose,instructions:agent.instructions,capabilities:agent.capabilities,keywords:agent.keywords,
    requiredAnyPermissions:agent.requiredAnyPermissions as DefinitionInput['requiredAnyPermissions'],maxActionLevel:agent.maxActionLevel,
    autonomyLevel:agent.autonomyLevel,allowedTools:agent.allowedTools as DefinitionInput['allowedTools'],allowedActionTypes:agent.allowedActionTypes as DefinitionInput['allowedActionTypes'],
    triggerModes:agent.triggerModes as DefinitionInput['triggerModes'],contextSources:agent.contextSources as DefinitionInput['contextSources'],evidenceRequirements:agent.evidenceRequirements,
  });
}

function fingerprint(definition:DefinitionInput){
  return createHash('sha256').update(JSON.stringify(definition)).digest('hex');
}

function versionRecord(agentId:string,version:number,definition:DefinitionInput,actor:ActorContext):CustomAgentVersion{
  const d=normalizedDefinition(definition);
  return {id:`v${version}`,agentId,version,fingerprint:fingerprint(d),createdBy:actor.uid,createdAt:now(),...d,hardMaxActionLevel:'prepare',requiresHumanApprovalForConsequentialActions:true,executionAuthority:'none'};
}

function auditView(agent:RegisteredCustomAgentDefinition){return {...agent,instructions:'[governed instructions stored]'};}
function executionRecord(agent:RegisteredCustomAgentDefinition,actor:ActorContext,event:string,kind:CustomAgentExecutionRecord['kind'],outcome:CustomAgentExecutionRecord['outcome'],evidenceRefs:string[]):CustomAgentExecutionRecord{
  return {id:randomUUID(),agentId:agent.id,version:agent.currentVersion,versionId:agent.currentVersionId,kind,event,outcome,createdBy:actor.uid,createdAt:now(),humanApprovalRequired:true,authoritativeHrWritesPerformed:false,evidenceRefs};
}
function unsafeInstructionEvidence(instructions:string){
  const risky=[/\bbypass\b.{0,40}\bapproval\b/i,/\bwithout\b.{0,40}\bhuman approval\b/i,/\bautomatically\s+(hire|reject|terminate|fire|discipline|promote|demote|approve|deny)\b/i,/\bexecute\b.{0,30}\bwithout\b.{0,30}\breview\b/i];
  return risky.some(pattern=>pattern.test(instructions));
}
function simulationChecks(agent:RegisteredCustomAgentDefinition){
  return [
    {id:'authority_ceiling',passed:agent.hardMaxActionLevel==='prepare'&&String(agent.maxActionLevel)!=='execute',evidence:'Hard authority ceiling remains Prepare; Execute is unavailable.'},
    {id:'human_oversight',passed:agent.humanOversight===true&&agent.requiresHumanApprovalForConsequentialActions===true,evidence:'Human oversight and consequential-action approval are mandatory.'},
    {id:'no_execution_authority',passed:agent.executionAuthority==='none',evidence:'The custom agent has no direct authoritative HR execution authority.'},
    {id:'tool_allowlist',passed:agent.allowedTools.length>0,evidence:`${agent.allowedTools.length} governed tool(s) explicitly allowlisted.`},
    {id:'action_allowlist',passed:agent.allowedActionTypes.length>0&&!agent.allowedActionTypes.includes('execute'),evidence:`${agent.allowedActionTypes.length} non-executing action type(s) allowlisted.`},
    {id:'evidence_policy',passed:agent.evidenceRequirements.length>0&&agent.contextSources.length>0&&agent.requiredAnyPermissions.length>0,evidence:'Evidence requirements, context sources and RBAC evidence gates are configured.'},
    {id:'trigger_policy',passed:agent.triggerModes.length>0,evidence:'At least one trigger mode is explicit; triggers may detect or prepare but never execute employment decisions.'},
    {id:'instruction_safety',passed:!unsafeInstructionEvidence(agent.instructions),evidence:'Instructions do not request approval bypass or automatic consequential employment decisions.'},
  ];
}

export async function listCustomAgents(actor:ActorContext):Promise<AgentBuilderDashboard>{
  requireRead(actor);
  const snap=await adminDb().collection(`organizations/${actor.orgId}/aiAgentDefinitions`).orderBy('updatedAt','desc').limit(100).get();
  return {agents:snap.docs.map(d=>normalizeAgent(d.data() as CustomAgentDefinition)),canManage:actor.permissions.includes('ai.manage'),canApprove:actor.permissions.includes('ai.approve'),safetyNotice:'Custom agents are configuration and orchestration helpers. Their hard authority ceiling is Prepare; they cannot gain Execute authority or bypass existing domain permissions, approvals, MFA, audit, or consequential-employment controls.',systemOfRecordNotice:'H51.1 records each agent as a tenant-scoped governed asset with immutable configuration versions, simulation evidence and execution/lifecycle history. AI may interpret and prepare; authoritative HR services and authorized people remain in control.'};
}

export async function createCustomAgent(actor:ActorContext,raw:unknown):Promise<RegisteredCustomAgentDefinition>{
  requireManage(actor);
  const parsed=createSchema.parse(raw),input=normalizedDefinition(parsed),reserved=new Set(allCortexAgents().map(x=>x.id));
  let id=`custom-${slug(input.name)}-${randomUUID().slice(0,8)}`;while(reserved.has(id))id=`custom-${slug(input.name)}-${randomUUID().slice(0,8)}`;
  const timestamp=now(),version=versionRecord(id,1,input,actor);
  const row:RegisteredCustomAgentDefinition={id,...input,hardMaxActionLevel:'prepare',humanOversight:true,status:'draft',createdBy:actor.uid,createdAt:timestamp,updatedBy:actor.uid,updatedAt:timestamp,ownerUid:actor.uid,stewardUid:parsed.stewardUid||actor.uid,requiresHumanApprovalForConsequentialActions:true,executionAuthority:'none',currentVersion:1,currentVersionId:version.id,systemRecordState:'versioned',latestSimulationStatus:'not_run'};
  const db=adminDb(),audit=buildAudit(actor,{action:'ai.custom_agent.create',entityType:'aiAgentDefinition',entityId:id,after:auditView(row)}),exec=executionRecord(row,actor,'agent_registered','versioning','prepared',[`version:${version.id}`,`fingerprint:${version.fingerprint}`]),batch=db.batch();
  batch.create(db.doc(`organizations/${actor.orgId}/aiAgentDefinitions/${id}`),row);
  batch.create(db.doc(`organizations/${actor.orgId}/aiAgentDefinitions/${id}/versions/${version.id}`),version);
  batch.create(db.doc(`organizations/${actor.orgId}/aiAgentDefinitions/${id}/executions/${exec.id}`),exec);
  batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);
  await batch.commit();return row;
}

export async function actCustomAgent(actor:ActorContext,id:string,raw:unknown):Promise<RegisteredCustomAgentDefinition>{
  const parsed=actionSchema.parse(raw),db=adminDb(),ref=db.doc(`organizations/${actor.orgId}/aiAgentDefinitions/${id}`),snap=await ref.get();
  if(!snap.exists)throw new ApiError(404,'Custom agent not found.','custom_agent_not_found');
  const before=normalizeAgent(snap.data() as CustomAgentDefinition),timestamp=now();

  if(parsed.action==='simulate'){
    requireManage(actor);
    if(before.status==='retired')throw new ApiError(409,'Retired agents cannot be simulated. Create a new governed version instead.','invalid_custom_agent_state');
    const checks=simulationChecks(before),passed=checks.every(x=>x.passed),simId=randomUUID();
    const simulation:CustomAgentSimulationRecord={id:simId,agentId:id,version:before.currentVersion,versionId:before.currentVersionId,status:passed?'passed':'failed',createdBy:actor.uid,createdAt:timestamp,checks,fingerprint:fingerprint(definitionFromAgent(before)),authoritativeWritesPerformed:false};
    const patch:Partial<CustomAgentDefinition>={updatedBy:actor.uid,updatedAt:timestamp,latestSimulationStatus:simulation.status,latestSimulationId:simId,latestSimulationAt:timestamp,latestSimulationBy:actor.uid,latestSimulationVersion:before.currentVersion};
    const after={...before,...patch} as RegisteredCustomAgentDefinition,exec=executionRecord(after,actor,'dry_run_simulation','simulation',passed?'passed':'blocked',[`simulation:${simId}`,`version:${before.currentVersionId}`,`fingerprint:${simulation.fingerprint}`]),audit=buildAudit(actor,{action:'ai.custom_agent.simulate',entityType:'aiAgentDefinition',entityId:id,before:auditView(before),after:auditView(after)}),batch=db.batch();
    if(before.systemRecordState==='legacy_unversioned'){
      const adopted=versionRecord(id,1,definitionFromAgent(before),actor);
      patch.currentVersion=1;patch.currentVersionId=adopted.id;patch.systemRecordState='versioned';simulation.versionId=adopted.id;exec.versionId=adopted.id;
      batch.create(db.doc(`organizations/${actor.orgId}/aiAgentDefinitions/${id}/versions/${adopted.id}`),adopted);
    }
    batch.set(ref,patch,{merge:true});
    batch.create(db.doc(`organizations/${actor.orgId}/aiAgentDefinitions/${id}/simulations/${simId}`),simulation);
    batch.create(db.doc(`organizations/${actor.orgId}/aiAgentDefinitions/${id}/executions/${exec.id}`),exec);
    batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);
    await batch.commit();return normalizeAgent({...after,...patch} as CustomAgentDefinition);
  }

  if(parsed.action==='revise'){
    requireManage(actor);
    if(before.status==='retired')throw new ApiError(409,'Retired agents cannot be revised. Create a new governed agent instead.','invalid_custom_agent_state');
    const input=normalizedDefinition(parsed.definition),nextVersion=before.currentVersion+1,version=versionRecord(id,nextVersion,input,actor);
    const patch:Partial<CustomAgentDefinition>={...input,updatedBy:actor.uid,updatedAt:timestamp,status:'draft',currentVersion:nextVersion,currentVersionId:version.id,systemRecordState:'versioned',latestSimulationStatus:'not_run',latestSimulationVersion:0};
    const after={...before,...patch} as RegisteredCustomAgentDefinition,exec=executionRecord(after,actor,'new_immutable_version','versioning','prepared',[`version:${version.id}`,`fingerprint:${version.fingerprint}`]),audit=buildAudit(actor,{action:'ai.custom_agent.revise',entityType:'aiAgentDefinition',entityId:id,before:auditView(before),after:auditView(after)}),batch=db.batch();
    batch.create(db.doc(`organizations/${actor.orgId}/aiAgentDefinitions/${id}/versions/${version.id}`),version);
    batch.set(ref,patch,{merge:true});
    batch.create(db.doc(`organizations/${actor.orgId}/aiAgentDefinitions/${id}/executions/${exec.id}`),exec);
    batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);
    await batch.commit();return normalizeAgent(after);
  }

  let patch:Partial<CustomAgentDefinition>={updatedBy:actor.uid,updatedAt:timestamp};
  if(parsed.action==='submit_review'){
    requireManage(actor);
    if(before.status!=='draft')throw new ApiError(409,'Only draft agents can be submitted for review.','invalid_custom_agent_state');
    if(before.systemRecordState!=='versioned'||before.latestSimulationStatus!=='passed'||before.latestSimulationVersion!==before.currentVersion)throw new ApiError(409,'Run and pass a dry-run simulation for the current immutable version before review.','custom_agent_simulation_required');
    patch={...patch,status:'in_review',submittedAt:timestamp};
  }
  if(parsed.action==='activate'){
    requireApprove(actor);
    if(before.status!=='in_review')throw new ApiError(409,'Only reviewed agents can be activated.','invalid_custom_agent_state');
    if(before.ownerUid===actor.uid)throw new ApiError(409,'Custom agent activation requires an independent approver who is not the agent owner.','custom_agent_self_approval');
    if(before.latestSimulationStatus!=='passed'||before.latestSimulationVersion!==before.currentVersion)throw new ApiError(409,'The current immutable version must have a passing dry-run simulation before activation.','custom_agent_simulation_required');
    patch={...patch,status:'active',activatedBy:actor.uid,activatedAt:timestamp};
  }
  if(parsed.action==='retire'){
    requireManage(actor);if(before.status==='retired')return before;patch={...patch,status:'retired',retiredBy:actor.uid,retiredAt:timestamp};
  }
  const after={...before,...patch} as RegisteredCustomAgentDefinition;
  const outcome:CustomAgentExecutionRecord['outcome']=parsed.action==='activate'?'approved':parsed.action==='retire'?'retired':'prepared';
  const exec=executionRecord(after,actor,parsed.action,'lifecycle',outcome,[`version:${before.currentVersionId}`,...(before.latestSimulationId?[`simulation:${before.latestSimulationId}`]:[])]),audit=buildAudit(actor,{action:`ai.custom_agent.${parsed.action}`,entityType:'aiAgentDefinition',entityId:id,before:auditView(before),after:auditView(after)}),batch=db.batch();
  batch.set(ref,patch,{merge:true});batch.create(db.doc(`organizations/${actor.orgId}/aiAgentDefinitions/${id}/executions/${exec.id}`),exec);batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);await batch.commit();return normalizeAgent(after);
}

export async function getCustomAgentHistory(actor:ActorContext,id:string):Promise<AgentSystemRecordHistory>{
  requireRead(actor);const db=adminDb(),ref=db.doc(`organizations/${actor.orgId}/aiAgentDefinitions/${id}`),snap=await ref.get();if(!snap.exists)throw new ApiError(404,'Custom agent not found.','custom_agent_not_found');
  const [versions,simulations,executions]=await Promise.all([
    ref.collection('versions').orderBy('version','desc').limit(25).get(),
    ref.collection('simulations').orderBy('createdAt','desc').limit(25).get(),
    ref.collection('executions').orderBy('createdAt','desc').limit(50).get(),
  ]);
  return {agent:normalizeAgent(snap.data() as CustomAgentDefinition),versions:versions.docs.map(d=>d.data() as CustomAgentVersion),simulations:simulations.docs.map(d=>d.data() as CustomAgentSimulationRecord),executions:executions.docs.map(d=>d.data() as CustomAgentExecutionRecord),governanceNotice:'History is evidence only. Immutable versions are never overwritten, simulations perform no authoritative HR writes, and lifecycle records do not replace the audit log or downstream domain-service approvals.'};
}

export function assertCustomAgentRuntimeBoundary(agent:CustomAgentDefinition,input:{toolId:string;actionType:string;consequential:boolean}){
  const a=normalizeAgent(agent);
  if(a.status!=='active')throw new ApiError(409,'Custom agent is not active.','custom_agent_inactive');
  if(!a.allowedTools.includes(input.toolId))throw new ApiError(403,'Tool is not allowlisted for this agent version.','custom_agent_tool_not_allowed');
  if(!a.allowedActionTypes.includes(input.actionType))throw new ApiError(403,'Action type is not allowlisted for this agent version.','custom_agent_action_not_allowed');
  if(input.consequential)throw new ApiError(409,'Consequential HR actions require an authorized human decision through the authoritative domain workflow.','custom_agent_human_approval_required');
  return true;
}

export async function activeCustomCortexAgents(actor:ActorContext):Promise<CortexAgentDefinition[]>{
  const snap=await adminDb().collection(`organizations/${actor.orgId}/aiAgentDefinitions`).where('status','==','active').limit(50).get();
  return snap.docs.map(d=>normalizeAgent(d.data() as CustomAgentDefinition)).filter(x=>actor.permissions.includes('ai.manage')||x.requiredAnyPermissions.some(p=>actor.permissions.includes(p as Permission))).map(x=>({id:x.id,name:x.name,purpose:x.purpose,capabilities:[...x.capabilities],requiredAnyPermissions:[...x.requiredAnyPermissions],maxActionLevel:x.maxActionLevel,humanOversight:true}));
}

export async function activeCustomAgentDefinitions(actor:ActorContext):Promise<CustomAgentDefinition[]>{
  const snap=await adminDb().collection(`organizations/${actor.orgId}/aiAgentDefinitions`).where('status','==','active').limit(50).get();
  return snap.docs.map(d=>normalizeAgent(d.data() as CustomAgentDefinition)).filter(x=>x.requiredAnyPermissions.some(p=>actor.permissions.includes(p as Permission)));
}
