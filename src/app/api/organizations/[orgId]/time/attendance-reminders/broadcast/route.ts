import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { sendAttendanceAdminBroadcast } from '@/lib/time/attendance-admin-service';

export async function POST(request:Request,context:{params:Promise<{orgId:string}>}){
  try{
    const{orgId}=await context.params;
    const actor=await actorFromRequest(request,orgId);
    requirePermission(actor,'time.manage');
    return NextResponse.json({data:await sendAttendanceAdminBroadcast(actor,await request.json())},{status:201});
  }catch(error){
    return apiErrorResponse(error);
  }
}
