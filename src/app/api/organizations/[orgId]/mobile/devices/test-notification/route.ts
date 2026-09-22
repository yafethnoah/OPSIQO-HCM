import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { sendMobilePushSelfTest } from '@/lib/mobile/service';

export async function POST(request:Request,context:{params:Promise<{orgId:string}>}){
  try{
    const{orgId}=await context.params;
    const actor=await actorFromRequest(request,orgId);
    return NextResponse.json({data:await sendMobilePushSelfTest(actor)},{status:200});
  }catch(error){
    return apiErrorResponse(error);
  }
}
