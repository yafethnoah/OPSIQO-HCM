import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse, ApiError } from '@/lib/http/errors';
import {
  correctEmployeeCore,
  deleteDuplicateEmployee,
  getEmployee,
  isDirectReport,
} from '@/lib/hr/service';

export async function GET(
  request: Request,
  context: { params: Promise<{ orgId: string; workerId: string }> },
) {
  try {
    const { orgId, workerId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    if (actor.workerId === workerId) {
      requirePermission(actor, 'self.read');
    } else if (actor.permissions.includes('people.read.private')) {
      requirePermission(actor, 'people.read.private');
    } else if (actor.permissions.includes('team.read') && await isDirectReport(actor, workerId)) {
      requirePermission(actor, 'team.read');
    } else {
      throw new ApiError(403, 'Private employee record access is not permitted.', 'forbidden');
    }
    return NextResponse.json({ data: await getEmployee(actor, workerId) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ orgId: string; workerId: string }> },
) {
  try {
    const { orgId, workerId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'people.manage');
    return NextResponse.json({
      data: await correctEmployeeCore(actor, workerId, await request.json()),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ orgId: string; workerId: string }> },
) {
  try {
    const { orgId, workerId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'people.manage');
    return NextResponse.json({
      data: await deleteDuplicateEmployee(actor, workerId, await request.json()),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
