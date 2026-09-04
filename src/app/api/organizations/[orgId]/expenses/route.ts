import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { createExpenseClaim, expenseWorkspace } from '@/lib/time/frontline-service';
export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'expense.read');return NextResponse.json({data:await expenseWorkspace(actor)});}catch(e){return apiErrorResponse(e);}}
export async function POST(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'expense.request');return NextResponse.json({data:await createExpenseClaim(actor,await request.formData())},{status:201});}catch(e){return apiErrorResponse(e);}}
