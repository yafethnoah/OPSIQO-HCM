import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { getEmployeeAccountAccess } from '@/lib/membership/account-access';

export async function GET(request: Request, context: { params: Promise<{ orgId: string; workerId: string }> }) {
  try {
    const { orgId, workerId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'membership.read');
    return NextResponse.json({ data: await getEmployeeAccountAccess(actor, workerId) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
