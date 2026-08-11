import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { releaseCompensationLetter } from '@/lib/compensation/service';
import { apiErrorResponse } from '@/lib/http/errors';

export async function PATCH(request: Request, context: { params: Promise<{ orgId: string; letterId: string }> }) {
  try {
    const { orgId, letterId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'compensation.approve');
    return NextResponse.json({ data: await releaseCompensationLetter(actor, letterId, await request.json()) });
  } catch (error) { return apiErrorResponse(error); }
}
