import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { recordTevvEvaluation } from '@/lib/intelligence-control-plane/tevv';
export async function POST(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params,actor=await actorFromRequest(request,orgId),body=await request.json();return NextResponse.json({data:await recordTevvEvaluation(actor,body?.observed||body)});}catch(e){return apiErrorResponse(e)}}
