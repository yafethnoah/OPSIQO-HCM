import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { createComplianceRequirement, listComplianceRequirements } from '@/lib/compliance/service';
export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'compliance.read');return NextResponse.json({data:await listComplianceRequirements(actor)});}catch(e){return apiErrorResponse(e);}}
export async function POST(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'compliance.manage');return NextResponse.json({data:await createComplianceRequirement(actor,await request.json())},{status:201});}catch(e){return apiErrorResponse(e);}}
