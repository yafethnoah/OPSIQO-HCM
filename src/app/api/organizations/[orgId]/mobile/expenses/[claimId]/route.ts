import { NextResponse } from 'next/server';
import {
  actorFromMobileSelfServiceRequest,
  requirePermission,
} from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { actExpenseClaim } from '@/lib/time/frontline-service';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ orgId: string; claimId: string }> },
) {
  try {
    const { orgId, claimId } = await context.params;
    const actor = await actorFromMobileSelfServiceRequest(request, orgId);

    if (!actor.workerId) {
      return NextResponse.json(
        {
          error: {
            code: 'mobile_worker_link_required',
            message:
              'Your OPSIQO Pulse account is not linked to an employee record.',
          },
        },
        { status: 409 },
      );
    }

    requirePermission(actor, 'expense.request');

    // actExpenseClaim applies the domain-level ownership/transition rules.
    return NextResponse.json({
      data: await actExpenseClaim(actor, claimId, await request.json()),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
