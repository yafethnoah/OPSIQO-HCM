import { NextResponse } from 'next/server';
import { identityFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { bootstrapFirstOrganization } from '@/lib/organization/bootstrap';

export async function POST(request: Request) {
  try {
    const identity = await identityFromRequest(request);
    const body = await request.json();
    return NextResponse.json({ data: await bootstrapFirstOrganization(identity, body) }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
