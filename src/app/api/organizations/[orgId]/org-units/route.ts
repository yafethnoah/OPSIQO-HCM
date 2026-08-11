import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { createOrgUnit, listOrgUnits } from '@/lib/hr/service';

export async function GET(request: Request, context: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'organization.read');
    return NextResponse.json({ data: await listOrgUnits(actor) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'organization.manage');
    return NextResponse.json({ data: await createOrgUnit(actor, await request.json()) }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
