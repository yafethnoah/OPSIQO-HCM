import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { createInvitation, listInvitations } from '@/lib/membership/service';

export async function GET(request: Request, context: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'membership.read');
    return NextResponse.json({ data: await listInvitations(actor) });
  } catch (error) { return apiErrorResponse(error); }
}

export async function POST(request: Request, context: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'membership.invite');
    return NextResponse.json({ data: await createInvitation(actor, await request.json()) }, { status: 201 });
  } catch (error) { return apiErrorResponse(error); }
}
