import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { listEmployeeDocuments, uploadEmployeeDocument } from '@/lib/compliance/service';
export async function GET(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'documents.read');const workerId=new URL(request.url).searchParams.get('workerId')||undefined;return NextResponse.json({data:await listEmployeeDocuments(actor,workerId)});}catch(e){return apiErrorResponse(e);}}
export async function POST(request:Request,context:{params:Promise<{orgId:string}>}){try{const{orgId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'documents.manage');return NextResponse.json({data:await uploadEmployeeDocument(actor,await request.formData())},{status:201});}catch(e){return apiErrorResponse(e);}}
