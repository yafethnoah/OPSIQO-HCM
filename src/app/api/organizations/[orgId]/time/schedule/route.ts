import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { createShift, scheduleWorkspace } from '@/lib/time/frontline-service';
export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'time.read');const u=new URL(request.url);return NextResponse.json({data:await scheduleWorkspace(actor,u.searchParams.get('start')||undefined,u.searchParams.get('end')||undefined)});}catch(e){return apiErrorResponse(e);}}
export async function POST(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'time.manage');return NextResponse.json({data:await createShift(actor,await request.json())},{status:201});}catch(e){return apiErrorResponse(e);}}
