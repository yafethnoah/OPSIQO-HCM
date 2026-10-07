import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { actOnFormPack, getFormPackWorkspace } from '@/lib/hr-forms-workflows/studio-service';

export async function GET(request:Request,context:{params:Promise<{orgId:string;packId:string}>}){
  try{
    const{orgId,packId}=await context.params,a=await actorFromRequest(request,orgId);
    requirePermission(a,'workflow.read');
    return NextResponse.json({data:await getFormPackWorkspace(a,packId)},{headers:{'Cache-Control':'no-store'}});
  }catch(e){return apiErrorResponse(e);}
}
export async function PATCH(request:Request,context:{params:Promise<{orgId:string;packId:string}>}){
  try{
    const{orgId,packId}=await context.params,a=await actorFromRequest(request,orgId);
    requirePermission(a,'workflow.manage');
    return NextResponse.json({data:await actOnFormPack(a,packId,await request.json())});
  }catch(e){return apiErrorResponse(e);}
}
