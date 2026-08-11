import { NextResponse } from 'next/server';
import { verifyAppCheckRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { updateCandidateProfile } from '@/lib/onboarding/service';
export async function PATCH(request:Request){try{await verifyAppCheckRequest(request);const token=request.headers.get('x-prehire-token')||'';return NextResponse.json({data:await updateCandidateProfile(token,await request.json())});}catch(e){return apiErrorResponse(e);}}
