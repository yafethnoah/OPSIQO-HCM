import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { actOnPrehireDocument, downloadPrehireDocument } from '@/lib/onboarding/service';
export const runtime='nodejs';
export async function GET(request:Request,context:{params:Promise<{orgId:string;caseId:string;documentId:string}>}){try{const{orgId,caseId,documentId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'people.read.private');const{doc,bytes}=await downloadPrehireDocument(actor,caseId,documentId);return new Response(new Uint8Array(bytes),{headers:{'content-type':doc.contentType,'content-disposition':`attachment; filename="${doc.fileName.replaceAll('"','')}"`,'cache-control':'private, no-store','x-content-type-options':'nosniff'}});}catch(e){return apiErrorResponse(e);}}

export async function PATCH(request:Request,context:{params:Promise<{orgId:string;caseId:string;documentId:string}>}){try{const{orgId,caseId,documentId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'onboarding.activate');return new Response(JSON.stringify({data:await actOnPrehireDocument(actor,caseId,documentId,await request.json())}),{headers:{'content-type':'application/json','cache-control':'no-store'}});}catch(e){return apiErrorResponse(e);}}
