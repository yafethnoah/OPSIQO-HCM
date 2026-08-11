import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { createEmployeeChange } from '@/lib/hr/service';

export async function POST(request: Request, context: { params: Promise<{ orgId: string; workerId: string }> }) {
  try {
    const { orgId, workerId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'people.manage');
    return NextResponse.json({ data: await createEmployeeChange(actor, workerId, await request.json()) }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
