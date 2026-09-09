import { createHash } from 'node:crypto';
import type { ActorContext } from '@/domain/security';
import type { ComplianceImpactCase, WorkGraphRef } from '@/domain/intelligence-control-plane';
import { adminDb } from '@/lib/firebase/admin';
import { ApiError } from '@/lib/http/errors';
import { queryWorkGraph } from './work-graph';
const MESSAGE='Potential regulatory impact identified — human/legal review required.';
export async function identifyComplianceImpact(actor:ActorContext,input:{changeRef:string;summary:string;object?:WorkGraphRef;evidenceRefs:string[]}){if(!actor.permissions.includes('compliance.read'))throw new ApiError(403,'Compliance read permission required.','forbidden');if(!input.evidenceRefs.length)throw new ApiError(400,'Regulatory impact detection requires source evidence.','evidence_required');const relationships=input.object?await queryWorkGraph(actor,{objectType:input.object.type,objectId:input.object.id,limit:100}):[],objects:WorkGraphRef[]=[...(input.object?[input.object]:[]),...relationships.flatMap(r=>[r.source,r.target])],dedup=new Map(objects.map(o=>[`${o.type}:${o.id}`,o])),id=createHash('sha256').update(`${actor.orgId}|${input.changeRef}`).digest('hex').slice(0,28),row:ComplianceImpactCase={id,changeRef:input.changeRef.slice(0,500),summary:input.summary.slice(0,2000),impactedObjects:[...dedup.values()].slice(0,100),evidenceRefs:input.evidenceRefs.slice(0,50),status:'human_legal_review',requiredMessage:MESSAGE,createdAt:new Date().toISOString()};await adminDb().doc(`organizations/${actor.orgId}/complianceIntelligenceCases/${id}`).set(row,{merge:true});return row;}
export const complianceHumanReviewMessage=MESSAGE;
