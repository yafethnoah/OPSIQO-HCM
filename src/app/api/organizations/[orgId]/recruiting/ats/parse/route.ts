import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { parseResumeIntake } from '@/lib/recruiting/ats-service';
export async function POST(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'recruiting.manage');return NextResponse.json({data:await parseResumeIntake(actor,await request.formData())});}catch(e){return apiErrorResponse(e)}}
