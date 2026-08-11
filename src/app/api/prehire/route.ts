import { NextResponse } from 'next/server';
import { verifyAppCheckRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { candidatePortal } from '@/lib/onboarding/service';
export async function GET(request:Request){try{await verifyAppCheckRequest(request);const token=request.headers.get('x-prehire-token')||'';return NextResponse.json({data:await candidatePortal(token)});}catch(e){return apiErrorResponse(e);}}
