import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { listManagerTeam } from '@/lib/hr/service';

export async function GET(request: Request, context: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'team.read');
    return NextResponse.json({ data: await listManagerTeam(actor) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
