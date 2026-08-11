import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { endSecondaryAssignment } from '@/lib/hr/service';

export async function POST(request: Request, context: { params: Promise<{ orgId: string; workerId: string; assignmentId: string }> }) {
  try {
    const { orgId, workerId, assignmentId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'people.manage');
    return NextResponse.json({ data: await endSecondaryAssignment(actor, workerId, assignmentId, await request.json()) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
