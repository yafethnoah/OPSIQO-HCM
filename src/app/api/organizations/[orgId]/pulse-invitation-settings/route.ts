import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import {
  getPulseInvitationSettings,
  updatePulseInvitationSettings,
} from '@/lib/membership/pulse-invitation-settings';

export async function GET(
  request: Request,
  context: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'organization.read');
    return NextResponse.json(
      { data: await getPulseInvitationSettings(actor) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'membership.manage');
    return NextResponse.json({
      data: await updatePulseInvitationSettings(actor, await request.json()),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
