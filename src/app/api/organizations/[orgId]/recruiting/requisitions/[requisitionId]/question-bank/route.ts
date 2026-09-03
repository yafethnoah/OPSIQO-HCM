import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { getInterviewQuestionBank } from '@/lib/recruiting/service';
export async function GET(request:Request,context:{params:Promise<{orgId:string;requisitionId:string}>}){try{const{orgId,requisitionId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'recruiting.interview');return NextResponse.json({data:await getInterviewQuestionBank(actor,requisitionId)});}catch(e){return apiErrorResponse(e);}}
