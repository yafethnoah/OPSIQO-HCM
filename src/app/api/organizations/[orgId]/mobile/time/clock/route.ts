import { NextResponse } from 'next/server';
import {
  actorFromMobileSelfServiceRequest,
  requirePermission,
} from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { clock } from '@/lib/time/service';

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
              'Your OPSIQO Pulse account is not linked to an employee record. Ask HR to link your account before using attendance.',
          },
        },
        { status: 409 },
      );
    }

    requirePermission(actor, 'time.clock');
    return NextResponse.json({
      data: await clock(actor, await request.json()),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
