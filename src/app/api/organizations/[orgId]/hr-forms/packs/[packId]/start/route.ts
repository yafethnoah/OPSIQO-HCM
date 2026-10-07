import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { startFormPack } from '@/lib/hr-forms-workflows/studio-service';

export async function POST(request:Request,context:{params:Promise<{orgId:string;packId:string}>}){
  try{
    const{orgId,packId}=await context.params,a=await actorFromRequest(request,orgId);
    requirePermission(a,'workflow.run');
    return NextResponse.json({data:await startFormPack(a,packId,await request.json())},{status:201});
  }catch(e){return apiErrorResponse(e);}
}
