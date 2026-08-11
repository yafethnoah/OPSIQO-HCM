import { NextResponse } from 'next/server';
import { verifyAppCheckRequest } from '@/lib/auth/session';
import { ApiError, apiErrorResponse } from '@/lib/http/errors';
import { uploadCandidateDocument } from '@/lib/onboarding/service';
export const runtime='nodejs';
export async function POST(request:Request){try{await verifyAppCheckRequest(request);const token=request.headers.get('x-prehire-token')||'';const form=await request.formData();const taskId=String(form.get('taskId')||'');const file=form.get('file');if(!taskId)throw new ApiError(400,'Document task is required.','task_required');if(!(file instanceof File))throw new ApiError(400,'File is required.','file_required');return NextResponse.json({data:await uploadCandidateDocument(token,taskId,file)},{status:201});}catch(e){return apiErrorResponse(e);}}
