import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { exportFormSubmission } from '@/lib/hr-forms-workflows/opsiqo-service';
export async function GET(request:Request,context:{params:Promise<{orgId:string;submissionId:string}>}){try{const{orgId,submissionId}=await context.params,a=await actorFromRequest(request,orgId);requirePermission(a,'documents.read');const format=new URL(request.url).searchParams.get('format')==='docx'?'docx':'pdf';const out=await exportFormSubmission(a,submissionId,format);return new Response(out.bytes as BodyInit,{headers:{'Content-Type':out.contentType,'Content-Disposition':`attachment; filename="${out.fileName}"`,'Cache-Control':'no-store'}});}catch(e){return apiErrorResponse(e);}}
