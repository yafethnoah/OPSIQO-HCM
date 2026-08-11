import { NextResponse } from 'next/server';
import { verifyAppCheckRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { actCandidateTask } from '@/lib/onboarding/service';
export async function PATCH(request:Request,context:{params:Promise<{taskId:string}>}){try{await verifyAppCheckRequest(request);const{taskId}=await context.params;const token=request.headers.get('x-prehire-token')||'';return NextResponse.json({data:await actCandidateTask(token,taskId,await request.json())});}catch(e){return apiErrorResponse(e);}}
