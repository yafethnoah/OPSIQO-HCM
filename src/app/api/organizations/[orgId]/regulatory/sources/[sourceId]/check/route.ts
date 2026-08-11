import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { checkRegulatorySource } from '@/lib/regulatory/service';
export async function POST(request:Request,context:{params:Promise<{orgId:string;sourceId:string}>}){try{const{orgId,sourceId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'regulatory.manage');return NextResponse.json({data:await checkRegulatorySource(actor,sourceId)});}catch(e){return apiErrorResponse(e);}}
