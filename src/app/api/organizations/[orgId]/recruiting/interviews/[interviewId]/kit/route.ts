import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { getInterviewKit, updateInterviewKit } from '@/lib/recruiting/service';
export async function GET(request:Request,context:{params:Promise<{orgId:string;interviewId:string}>}){try{const{orgId,interviewId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'recruiting.interview');return NextResponse.json({data:await getInterviewKit(actor,interviewId)});}catch(e){return apiErrorResponse(e);}}
export async function PATCH(request:Request,context:{params:Promise<{orgId:string;interviewId:string}>}){try{const{orgId,interviewId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'recruiting.interview');return NextResponse.json({data:await updateInterviewKit(actor,interviewId,await request.json())});}catch(e){return apiErrorResponse(e);}}
