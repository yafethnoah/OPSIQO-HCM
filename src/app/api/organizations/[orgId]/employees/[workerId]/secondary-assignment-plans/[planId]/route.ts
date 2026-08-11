import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { actOnSecondaryAssignmentPlan } from '@/lib/hr/service';

export async function POST(request: Request, context: { params: Promise<{ orgId: string; workerId: string; planId: string }> }) {
  try {
    const { orgId, workerId, planId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'people.manage');
    return NextResponse.json({ data: await actOnSecondaryAssignmentPlan(actor, workerId, planId, await request.json()) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
