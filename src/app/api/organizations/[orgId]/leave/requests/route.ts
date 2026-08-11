import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { getLeaveWorkspace, requestLeave } from '@/lib/time/service';
export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'leave.read');const u=new URL(request.url),workerId=u.searchParams.get('workerId')||actor.workerId;if(!workerId)return NextResponse.json({message:'workerId is required'},{status:400});return NextResponse.json({data:await getLeaveWorkspace(actor,workerId)});}catch(e){return apiErrorResponse(e);}}
export async function POST(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'leave.request');return NextResponse.json({data:await requestLeave(actor,await request.json())},{status:201});}catch(e){return apiErrorResponse(e);}}
