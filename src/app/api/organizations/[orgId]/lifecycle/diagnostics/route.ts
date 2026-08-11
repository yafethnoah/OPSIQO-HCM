import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { lifecycleDiagnostics, persistLifecycleDiagnosticRun } from '@/lib/lifecycle/service';
export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);return NextResponse.json({data:await lifecycleDiagnostics(actor)});}catch(e){return apiErrorResponse(e);}}
export async function POST(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);return NextResponse.json({data:await persistLifecycleDiagnosticRun(actor)},{status:201});}catch(e){return apiErrorResponse(e);}}
