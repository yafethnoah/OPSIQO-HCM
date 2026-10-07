import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { createFormInstance, listFormInstances } from '@/lib/hr-forms-workflows/opsiqo-service';

export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){
  try{
    const{orgId}=await context.params,a=await actorFromRequest(request,orgId);
    requirePermission(a,'workflow.read');
    const templateId=new URL(request.url).searchParams.get('templateId')||undefined;
    return NextResponse.json({data:await listFormInstances(a,templateId)});
  }catch(e){return apiErrorResponse(e);}
}
export async function POST(request:Request,context:{params:Promise<{orgId:string}>}){
  try{
    const{orgId}=await context.params,a=await actorFromRequest(request,orgId);
    requirePermission(a,'workflow.run');
    return NextResponse.json({data:await createFormInstance(a,await request.json())},{status:201});
  }catch(e){return apiErrorResponse(e);}
}
