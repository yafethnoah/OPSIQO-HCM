import type {ActorContext} from '@/domain/security';
import type {Application,Requisition} from '@/domain/recruiting';
import type {CandidateApplicationDocument} from '@/domain/candidate-portal';
import {adminBucket,adminDb} from '@/lib/firebase/admin';
import {ApiError} from '@/lib/http/errors';
const hrRoles=new Set(['super_admin','org_admin','hr_admin','hr_partner']);
async function scoped(actor:ActorContext,applicationId:string){
 const db=adminDb(),a=await db.doc(`organizations/${actor.orgId}/applications/${applicationId}`).get();if(!a.exists)throw new ApiError(404,'Application not found.','application_not_found');
 const app=a.data() as Application,r=await db.doc(`organizations/${actor.orgId}/requisitions/${app.requisitionId}`).get();if(!r.exists)throw new ApiError(404,'Requisition not found.','requisition_not_found');
 const req=r.data() as Requisition;if(!hrRoles.has(actor.role)&&req.hiringManagerWorkerId!==actor.workerId)throw new ApiError(403,'Application is outside your recruiting scope.','recruiting_scope');return app;
}
export async function listCandidateApplicationDocuments(actor:ActorContext,applicationId:string){
 await scoped(actor,applicationId);const s=await adminDb().collection(`organizations/${actor.orgId}/candidateApplicationDocuments`).where('applicationId','==',applicationId).limit(50).get();
 return s.docs.map(d=>d.data() as CandidateApplicationDocument).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(({storagePath:_p,text,...d})=>({...d,hasExtractedText:Boolean(text?.trim()),textPreview:text?.trim().slice(0,800)}));
}
export async function downloadCandidateApplicationDocument(actor:ActorContext,applicationId:string,documentId:string){
 await scoped(actor,applicationId);const s=await adminDb().doc(`organizations/${actor.orgId}/candidateApplicationDocuments/${documentId}`).get();if(!s.exists)throw new ApiError(404,'Candidate document not found.','document_not_found');
 const document=s.data() as CandidateApplicationDocument;if(document.applicationId!==applicationId)throw new ApiError(404,'Candidate document not found for this application.','document_not_found');
 const[bytes]=await adminBucket().file(document.storagePath).download();return{document,bytes};
}
