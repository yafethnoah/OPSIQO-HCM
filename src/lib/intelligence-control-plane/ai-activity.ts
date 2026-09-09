import { randomUUID } from 'node:crypto';
import type { ActorContext } from '@/domain/security';
import type { AiActivityRecord } from '@/domain/intelligence-control-plane';
import { adminDb } from '@/lib/firebase/admin';
const now=()=>new Date().toISOString();
export async function recordAiActivity(actor:ActorContext,input:Omit<AiActivityRecord,'id'|'organizationId'|'actorId'|'createdAt'>){const row:AiActivityRecord={id:randomUUID(),organizationId:actor.orgId,actorId:actor.uid,createdAt:now(),...input};await adminDb().doc(`organizations/${actor.orgId}/aiActivities/${row.id}`).create(row);return row;}
export async function aiActivitySummary(actor:ActorContext,limit=500){const snap=await adminDb().collection(`organizations/${actor.orgId}/aiActivities`).orderBy('createdAt','desc').limit(Math.max(1,Math.min(1000,limit))).get(),rows=snap.docs.map(d=>d.data() as AiActivityRecord),money=rows.map(r=>r.monetaryCost).filter((x):x is number=>typeof x==='number'&&Number.isFinite(x)),tokens=rows.map(r=>r.tokenCost).filter((x):x is number=>typeof x==='number'&&Number.isFinite(x));return{rows,monetaryCost:money.length?Math.round(money.reduce((a,b)=>a+b,0)*10000)/10000:null,tokenCost:tokens.length?Math.round(tokens.reduce((a,b)=>a+b,0)):null,blocked:rows.filter(r=>r.permissionResult==='blocked').length,reversals:rows.filter(r=>Boolean(r.reversalResult)).length};}
