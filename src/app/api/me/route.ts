import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';

export async function GET(request: Request) {
  try {
    const actor = await actorFromRequest(request);
    return NextResponse.json({ actor });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
