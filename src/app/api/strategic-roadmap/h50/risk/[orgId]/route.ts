import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { ApiError, apiErrorResponse } from '@/lib/http/errors';
import {
  scoreH50ActionRisk,
  type H50ActionRiskFactors,
} from '@/lib/strategic/h50-foundation';

export async function POST(
  request: Request,
  context: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);

    if (
      !actor.permissions.includes('ai.use') &&
      !actor.permissions.includes('governance.read')
    ) {
      throw new ApiError(403, 'AI or governance access is required.', 'forbidden');
    }

    const body = (await request.json()) as {
      action?: unknown;
      factors?: H50ActionRiskFactors;
    };

    if (typeof body.action !== 'string' || !body.factors) {
      throw new ApiError(
        400,
        'Action and risk factors are required.',
        'invalid_request',
      );
    }

    return NextResponse.json({
      data: scoreH50ActionRisk(body.action, body.factors),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
