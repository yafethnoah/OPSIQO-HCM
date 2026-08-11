import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { downloadEmployeeDocument } from '@/lib/compliance/service';
export async function GET(request:Request,context:{params:Promise<{orgId:string;documentId:string}>}){try{const{orgId,documentId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'documents.read');const{version,bytes}=await downloadEmployeeDocument(actor,documentId);return new Response(new Uint8Array(bytes),{headers:{'content-type':version.contentType,'content-disposition':`attachment; filename*=UTF-8''${encodeURIComponent(version.fileName)}`,'cache-control':'private, no-store'}});}catch(e){return apiErrorResponse(e);}}
