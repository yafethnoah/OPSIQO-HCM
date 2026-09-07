import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { ApiError, apiErrorResponse } from '@/lib/http/errors';
import {
  buildH50ImpactPreview,
  type H50ImpactSignal,
} from '@/lib/strategic/h50-intelligence';
import type { StrategicRiskTier } from '@/lib/strategic/types';

export async function POST(
  request: Request,
  context: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);

    if (
      !actor.permissions.includes('workforce.read') &&
      !actor.permissions.includes('strategy.read')
    ) {
      throw new ApiError(
        403,
        'Workforce or strategy access is required.',
        'forbidden',
      );
    }

    const body = (await request.json()) as {
      action?: unknown;
      riskTier?: StrategicRiskTier;
      signals?: H50ImpactSignal[];
      assumptions?: string[];
      alternatives?: string[];
    };

    if (
      typeof body.action !== 'string' ||
      !body.riskTier ||
      !Array.isArray(body.signals) ||
      !Array.isArray(body.assumptions) ||
      !Array.isArray(body.alternatives)
    ) {
      throw new ApiError(400, 'Impact preview input is invalid.', 'invalid_request');
    }

    return NextResponse.json({
      data: buildH50ImpactPreview({
        orgId,
        action: body.action,
        riskTier: body.riskTier,
        signals: body.signals,
        assumptions: body.assumptions,
        alternatives: body.alternatives,
      }),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
