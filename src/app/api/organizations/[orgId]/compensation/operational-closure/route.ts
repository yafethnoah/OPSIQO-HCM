import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { reviewCompensationPayrollSync } from '@/lib/compensation/operational-closure';

export async function POST(
  request: Request,
  context: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    const body = await request.json() as { action?: string; workerId?: string; note?: string };

    if (body.action !== 'review_sync') {
      return NextResponse.json({ error: 'Unsupported operational closure action.', code: 'invalid_action' }, { status: 400 });
    }

    return NextResponse.json({
      data: await reviewCompensationPayrollSync(actor, String(body.workerId || ''), body.note),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}