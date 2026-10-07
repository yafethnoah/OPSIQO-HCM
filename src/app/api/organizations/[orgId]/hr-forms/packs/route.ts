import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { listFormPacks } from '@/lib/hr-forms-workflows/studio-service';

export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){
  try{
    const{orgId}=await context.params,a=await actorFromRequest(request,orgId);
    requirePermission(a,'workflow.read');
    return NextResponse.json({data:await listFormPacks(a)},{headers:{'Cache-Control':'no-store'}});
  }catch(e){return apiErrorResponse(e);}
}
