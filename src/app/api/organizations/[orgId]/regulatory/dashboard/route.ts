import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { regulatoryDashboard } from '@/lib/regulatory/service';
export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'regulatory.read');return NextResponse.json({data:await regulatoryDashboard(actor)});}catch(e){return apiErrorResponse(e);}}
