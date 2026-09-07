import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { ApiError, apiErrorResponse } from '@/lib/http/errors';
import {
  buildH50PayrollPreflight,
  type H50PayrollInputLine,
} from '@/lib/strategic/h50-platform';

export async function POST(
  request: Request,
  context: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);

    if (!actor.permissions.includes('payroll.export')) {
      throw new ApiError(403, 'Payroll export access is required.', 'forbidden');
    }

    const body = (await request.json()) as {
      lines?: H50PayrollInputLine[];
      previousAmountByWorker?: Record<string, number>;
      varianceThresholdPercent?: number;
    };

    if (!Array.isArray(body.lines)) {
      throw new ApiError(400, 'Payroll input lines are required.', 'invalid_request');
    }

    return NextResponse.json({
      data: buildH50PayrollPreflight({
        lines: body.lines,
        previousAmountByWorker: body.previousAmountByWorker,
        varianceThresholdPercent: body.varianceThresholdPercent,
      }),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
