import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { listWorkflowRuns, startWorkflow } from '@/lib/workflow/service';

export async function GET(request: Request, context: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'workflow.read');
    const url = new URL(request.url);
    return NextResponse.json({ data: await listWorkflowRuns(actor, Number(url.searchParams.get('limit') || 50)) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'workflow.run');
    return NextResponse.json({ data: await startWorkflow(actor, await request.json()) }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
