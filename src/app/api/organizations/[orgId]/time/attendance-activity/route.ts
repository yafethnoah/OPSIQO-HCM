import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { attendanceActivity } from '@/lib/time/frontline-service';

export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){
  try{
    const{orgId}=await context.params;
    const actor=await actorFromRequest(request,orgId);
    requirePermission(actor,'time.read');
    const url=new URL(request.url),requested=Number(url.searchParams.get('limit')||100),limit=Number.isFinite(requested)?Math.max(1,Math.min(Math.trunc(requested),200)):100;
    return NextResponse.json({data:await attendanceActivity(actor,limit)});
  }catch(e){
    return apiErrorResponse(e);
  }
}
