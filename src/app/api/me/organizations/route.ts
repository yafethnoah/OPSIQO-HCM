import { NextResponse } from 'next/server';
import { identityFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { listOrganizationsForIdentity } from '@/lib/organization/service';

export async function GET(request: Request) {
  try {
    const identity = await identityFromRequest(request);
    return NextResponse.json({ data: await listOrganizationsForIdentity(identity) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
