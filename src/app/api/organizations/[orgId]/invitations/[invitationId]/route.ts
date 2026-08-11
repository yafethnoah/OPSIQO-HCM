import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { actOnInvitation } from '@/lib/membership/service';

export async function POST(request: Request, context: { params: Promise<{ orgId: string; invitationId: string }> }) {
  try {
    const { orgId, invitationId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'membership.invite');
    return NextResponse.json({ data: await actOnInvitation(actor, invitationId, await request.json()) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
