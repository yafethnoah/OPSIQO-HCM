import { NextResponse } from 'next/server';
import { identityFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { activateOrganizationForIdentity } from '@/lib/organization/service';

export async function POST(request: Request) {
  try {
    const identity = await identityFromRequest(request);
    const body = await request.json().catch(() => ({})) as { orgId?: unknown; reason?: unknown };
    const orgId = typeof body.orgId === 'string' ? body.orgId.trim() : '';
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 80) : 'user_switch';
    return NextResponse.json({ data: await activateOrganizationForIdentity(identity, orgId, reason) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
