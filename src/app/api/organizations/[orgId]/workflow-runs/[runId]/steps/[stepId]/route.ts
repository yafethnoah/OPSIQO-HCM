import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { actOnWorkflowStep } from '@/lib/workflow/service';

export async function POST(request: Request, context: { params: Promise<{ orgId: string; runId: string; stepId: string }> }) {
  try {
    const { orgId, runId, stepId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'workflow.act');
    return NextResponse.json({ data: await actOnWorkflowStep(actor, runId, stepId, await request.json()) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
