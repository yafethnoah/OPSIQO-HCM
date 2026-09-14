import { NextResponse } from 'next/server';
import {
  actorFromMobileSelfServiceRequest,
  requirePermission,
} from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { createExpenseClaim } from '@/lib/time/frontline-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  context: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromMobileSelfServiceRequest(request, orgId);

    if (!actor.workerId) {
      return NextResponse.json(
        {
          error: {
            code: 'mobile_worker_link_required',
            message:
              'Your OPSIQO Pulse account is not linked to an employee record. Ask HR to link your account before submitting expenses.',
          },
        },
        { status: 409 },
      );
    }

    requirePermission(actor, 'expense.request');
    return NextResponse.json(
      { data: await createExpenseClaim(actor, await request.formData()) },
      { status: 201 },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
