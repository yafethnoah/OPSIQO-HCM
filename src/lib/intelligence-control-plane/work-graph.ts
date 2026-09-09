import { createHash, randomUUID } from 'node:crypto';
import type { ActorContext, Permission } from '@/domain/security';
import type { IntelligenceSensitivity, WorkGraphRelationship, WorkGraphRef } from '@/domain/intelligence-control-plane';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { buildAudit } from '@/lib/audit/service';

const now=()=>new Date().toISOString();
const collection=(orgId:string)=>`organizations/${orgId}/workGraphRelationships`;
const clean=(v:unknown,max=240)=>String(v??'').trim().slice(0,max);
const stableId=(source:WorkGraphRef,relation:string,target:WorkGraphRef,validFrom:string)=>createHash('sha256').update(`${source.type}:${source.id}|${relation}|${target.type}:${target.id}|${validFrom}`).digest('hex').slice(0,32);
function canRead(actor:ActorContext, row:WorkGraphRelationship){return row.readPermissions.length===0||row.readPermissions.some(p=>actor.permissions.includes(p));}
function requireGraphManage(actor:ActorContext){if(!(actor.permissions.includes('ai.manage')||actor.permissions.includes('governance.manage')||actor.permissions.includes('organization.manage')))throw new ApiError(403,'Work graph management permission required.','forbidden');}

export async function upsertWorkGraphRelationship(actor:ActorContext,input:{source:WorkGraphRef;relation:string;target:WorkGraphRef;validFrom?:string;validTo?:string;provenance:string[];confidence:number;verificationStatus?:WorkGraphRelationship['verificationStatus'];sensitivity?:IntelligenceSensitivity;readPermissions?:Permission[]}):Promise<WorkGraphRelationship>{
  requireGraphManage(actor);
  const relation=clean(input.relation,80).toLowerCase().replace(/[^a-z0-9._:-]+/g,'_');
  if(!relation||!input.source?.type||!input.source?.id||!input.target?.type||!input.target?.id)throw new ApiError(400,'Source, relationship and target are required.','invalid_work_graph_relationship');
  if(!input.provenance?.length)throw new ApiError(400,'Work graph relationships require provenance.','work_graph_provenance_required');
  const validFrom=input.validFrom||now(),id=stableId(input.source,relation,input.target,validFrom),ref=adminDb().doc(`${collection(actor.orgId)}/${id}`),beforeSnap=await ref.get();
  const before=beforeSnap.exists?beforeSnap.data() as WorkGraphRelationship:undefined;
  const row:WorkGraphRelationship={id,source:{...input.source,type:clean(input.source.type,60),id:clean(input.source.id,160),label:input.source.label?clean(input.source.label):undefined},relation,target:{...input.target,type:clean(input.target.type,60),id:clean(input.target.id,160),label:input.target.label?clean(input.target.label):undefined},validFrom,validTo:input.validTo,provenance:input.provenance.map(x=>clean(x,500)).filter(Boolean).slice(0,20),confidence:Math.max(0,Math.min(100,Math.round(input.confidence))),verificationStatus:input.verificationStatus||'verified',sensitivity:input.sensitivity||'internal',readPermissions:(input.readPermissions||[]).slice(0,30),createdAt:before?.createdAt||now(),updatedAt:now()};
  const audit=buildAudit(actor,{action:before?'intelligence.work_graph.update':'intelligence.work_graph.create',entityType:'workGraphRelationship',entityId:id,before,after:row});
  const batch=adminDb().batch();batch.set(ref,row);batch.create(adminDb().doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);await batch.commit();return row;
}

export async function closeWorkGraphRelationship(actor:ActorContext,id:string,validTo=now()){requireGraphManage(actor);const ref=adminDb().doc(`${collection(actor.orgId)}/${id}`),snap=await ref.get();if(!snap.exists)throw new ApiError(404,'Work graph relationship not found.','not_found');const before=snap.data() as WorkGraphRelationship,row={...before,validTo,updatedAt:now()};const audit=buildAudit(actor,{action:'intelligence.work_graph.close',entityType:'workGraphRelationship',entityId:id,before,after:row});const batch=adminDb().batch();batch.set(ref,row);batch.create(adminDb().doc(`organizations/${actor.orgId}/auditLogs/${audit.id}`),audit);await batch.commit();return row;}

export async function queryWorkGraph(actor:ActorContext,input:{objectType?:string;objectId?:string;relation?:string;activeAt?:string;limit?:number}={}):Promise<WorkGraphRelationship[]>{
  if(!(actor.permissions.includes('self.read')||actor.permissions.includes('team.read')||actor.permissions.includes('organization.read')||actor.permissions.includes('ai.use')))throw new ApiError(403,'Work graph read permission required.','forbidden');
  const limit=Math.max(1,Math.min(250,Math.round(input.limit||100))),snap=await adminDb().collection(collection(actor.orgId)).limit(limit*3).get(),at=Date.parse(input.activeAt||now());
  return snap.docs.map(d=>d.data() as WorkGraphRelationship).filter(row=>{
    if(!canRead(actor,row))return false;
    if(input.relation&&row.relation!==input.relation)return false;
    if(input.objectType&&input.objectId){const hit=(row.source.type===input.objectType&&row.source.id===input.objectId)||(row.target.type===input.objectType&&row.target.id===input.objectId);if(!hit)return false;}
    const from=Date.parse(row.validFrom),to=row.validTo?Date.parse(row.validTo):Number.POSITIVE_INFINITY;return (!Number.isFinite(from)||from<=at)&&(!Number.isFinite(to)||at<to);
  }).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,limit);
}

export function relatedObjects(rows:WorkGraphRelationship[],ref:WorkGraphRef){return rows.filter(r=>(r.source.type===ref.type&&r.source.id===ref.id)||(r.target.type===ref.type&&r.target.id===ref.id)).map(r=>({relationship:r,other:r.source.type===ref.type&&r.source.id===ref.id?r.target:r.source}));}
export function newRelationshipId(){return randomUUID();}
