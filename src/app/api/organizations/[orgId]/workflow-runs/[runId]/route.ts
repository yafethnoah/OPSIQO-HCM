import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { getWorkflowRun } from '@/lib/workflow/service';

export async function GET(request: Request, context: { params: Promise<{ orgId: string; runId: string }> }) {
  try {
    const { orgId, runId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'workflow.read');
    return NextResponse.json({ data: await getWorkflowRun(actor, runId) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
