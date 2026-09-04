import type { ActorContext } from '@/domain/security';
import type { OpsiQoActionLevel } from '@/domain/opsiqo-one';
import type { OpsiQoAgentPolicy, OpsiQoEffectiveAgentPolicy } from '@/domain/opsiqo-one-v7-11';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';
import { allCortexAgents, clampActionLevel } from './cortex';
import { activeCustomCortexAgents } from './agent-builder';

const levels: OpsiQoActionLevel[]=['observe','recommend','prepare','execute'];
const now=()=>new Date().toISOString();
const levelIndex=(level:OpsiQoActionLevel)=>levels.indexOf(level);

export async function effectiveAgentPolicies(actor:ActorContext):Promise<OpsiQoEffectiveAgentPolicy[]> {
  const definitions=[...allCortexAgents(),...await activeCustomCortexAgents(actor)];
  const snap=await adminDb().collection(`organizations/${actor.orgId}/aiAgentPolicies`).limit(100).get();
  const configured=new Map<string,OpsiQoAgentPolicy>(snap.docs.map((d:any)=>[d.id,d.data() as OpsiQoAgentPolicy]));
  const editable=actor.permissions.includes('ai.manage');
  return definitions.map(def=>{
    const stored=configured.get(def.id);
    const defaultLevel=def.maxActionLevel;
    const requested=stored?.maxActionLevel||defaultLevel;
    const effective=clampActionLevel(requested,def.maxActionLevel);
    return {
      agentId:def.id,
      agentName:def.name,
      purpose:def.purpose,
      enabled:stored?.enabled??true,
      maxActionLevel:effective,
      hardMaxActionLevel:def.maxActionLevel,
      shadowMode:stored?.shadowMode??(levelIndex(def.maxActionLevel)>=levelIndex('prepare')),
      humanOversight:def.humanOversight,
      capabilities:[...def.capabilities],
      updatedBy:stored?.updatedBy||'system-default',
      updatedAt:stored?.updatedAt||'2026-08-19T00:00:00.000Z',
      editable,
    };
  });
}

export async function saveAgentPolicy(actor:ActorContext,agentId:string,raw:unknown):Promise<OpsiQoEffectiveAgentPolicy> {
  if(!actor.permissions.includes('ai.manage'))throw new ApiError(403,'AI governance management permission required.','forbidden');
  const def=allCortexAgents().find(x=>x.id===agentId)||(await activeCustomCortexAgents(actor)).find(x=>x.id===agentId);if(!def)throw new ApiError(404,'Cortex agent not found.','cortex_agent_not_found');
  const input=(raw&&typeof raw==='object'?raw:{}) as Record<string,unknown>;
  if(typeof input.enabled!=='boolean'||typeof input.shadowMode!=='boolean'||!levels.includes(input.maxActionLevel as OpsiQoActionLevel))throw new ApiError(400,'Invalid AI agent policy.','invalid_agent_policy');
  const requested=input.maxActionLevel as OpsiQoActionLevel;
  if(levelIndex(requested)>levelIndex(def.maxActionLevel))throw new ApiError(409,`Requested action level exceeds the hard safety cap for ${def.name}.`,'agent_action_cap_exceeded');
  const db=adminDb(),ref=db.doc(`organizations/${actor.orgId}/aiAgentPolicies/${agentId}`),beforeSnap=await ref.get(),before=beforeSnap.exists?beforeSnap.data():undefined;
  const row:OpsiQoAgentPolicy={agentId,enabled:input.enabled,maxActionLevel:requested,shadowMode:input.shadowMode,updatedBy:actor.uid,updatedAt:now()};
  const audit=buildAudit(actor,{action:'ai.agent_policy.update',entityType:'aiAgentPolicy',entityId:agentId,before,after:row});
  const batch=db.batch();batch.set(ref,row);batch.create(db.doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);await batch.commit();
  const all=await effectiveAgentPolicies(actor);return all.find(x=>x.agentId===agentId)!;
}
