import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { addDocumentVersion } from '@/lib/compliance/service';
export async function POST(request:Request,context:{params:Promise<{orgId:string;documentId:string}>}){try{const{orgId,documentId}=await context.params;const actor=await actorFromRequest(request,orgId);requirePermission(actor,'documents.manage');const form=await request.formData(),file=form.get('file');if(!(file instanceof File))throw new Error('Document file required.');return NextResponse.json({data:await addDocumentVersion(actor,documentId,file)},{status:201});}catch(e){return apiErrorResponse(e);}}
