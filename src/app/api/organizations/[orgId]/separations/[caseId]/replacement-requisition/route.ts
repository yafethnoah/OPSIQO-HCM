import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { createReplacementRequisition } from '@/lib/lifecycle/service';
export async function POST(request:Request,context:{params:Promise<{orgId:string;caseId:string}>}){try{const{orgId,caseId}=await context.params;const actor=await actorFromRequest(request,orgId);const body=await request.json().catch(()=>({}));return NextResponse.json({data:await createReplacementRequisition(actor,caseId,body)},{status:201});}catch(e){return apiErrorResponse(e);}}
