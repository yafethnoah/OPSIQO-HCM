import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import {
  getCompensationPayrollSyncReview,
  reviewCompensationPayrollSync,
} from '@/lib/compensation/operational-closure';

export async function GET(
  request: Request,
  context: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    const url = new URL(request.url);
    const workerId = String(url.searchParams.get('workerId') || '').trim();
    if (!workerId) {
      return NextResponse.json(
        { error: 'workerId is required.', code: 'invalid_input' },
        { status: 400 },
      );
    }
    return NextResponse.json({
      data: await getCompensationPayrollSyncReview(actor, workerId),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    const body = await request.json() as {
      action?: string;
      workerId?: string;
      note?: string;
    };

    if (body.action !== 'review_sync') {
      return NextResponse.json(
        { error: 'Unsupported operational closure action.', code: 'invalid_action' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      data: await reviewCompensationPayrollSync(
        actor,
        String(body.workerId || ''),
        body.note,
      ),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}