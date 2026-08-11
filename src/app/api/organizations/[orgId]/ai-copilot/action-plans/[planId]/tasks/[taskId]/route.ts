import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { actActionPlanTask } from '@/lib/ai-intelligence/service';

export async function PATCH(request: Request, context: { params: Promise<{ orgId:string; planId:string; taskId:string }> }) {
  try {
    const { orgId, planId, taskId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'ai.manage');
    return NextResponse.json({ data: await actActionPlanTask(actor, planId, taskId, await request.json()) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
