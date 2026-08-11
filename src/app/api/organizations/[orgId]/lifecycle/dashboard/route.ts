import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { lifecycleDashboard } from '@/lib/lifecycle/service';
export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);return NextResponse.json({data:await lifecycleDashboard(actor)});}catch(e){return apiErrorResponse(e);}}
