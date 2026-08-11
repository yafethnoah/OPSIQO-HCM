import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { bootstrapRegulatorySources } from '@/lib/regulatory/service';
export async function POST(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'regulatory.approve');return NextResponse.json({data:await bootstrapRegulatorySources(actor)});}catch(e){return apiErrorResponse(e);}}
