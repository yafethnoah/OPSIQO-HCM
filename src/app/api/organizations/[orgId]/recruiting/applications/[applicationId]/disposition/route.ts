import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { disposeApplication } from '@/lib/recruiting/service';

export async function POST(request:Request,context:{params:Promise<{orgId:string;applicationId:string}>}){
  try{
    const{orgId,applicationId}=await context.params;
    const actor=await actorFromRequest(request,orgId);
    requirePermission(actor,'recruiting.manage');
    return NextResponse.json({data:await disposeApplication(actor,applicationId,await request.json())});
  }catch(e){return apiErrorResponse(e);}
}
