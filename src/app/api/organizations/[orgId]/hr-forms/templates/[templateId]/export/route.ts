import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { exportBlankTemplate } from '@/lib/hr-forms-workflows/studio-service';
export async function GET(request:Request,context:{params:Promise<{orgId:string;templateId:string}>}){try{const{orgId,templateId}=await context.params,a=await actorFromRequest(request,orgId);requirePermission(a,'workflow.manage');const format=new URL(request.url).searchParams.get('format')==='docx'?'docx':'pdf';const out=await exportBlankTemplate(a,templateId,format);return new Response(out.bytes as BodyInit,{headers:{'Content-Type':out.contentType,'Content-Disposition':`attachment; filename="${out.fileName}"`,'Cache-Control':'no-store'}});}catch(e){return apiErrorResponse(e);}}
