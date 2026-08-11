import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { createWorkflow, listWorkflows } from '@/lib/workflow/service';

export async function GET(request: Request, context: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'workflow.read');
    return NextResponse.json({ data: await listWorkflows(actor) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'workflow.manage');
    return NextResponse.json({ data: await createWorkflow(actor, await request.json()) }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
