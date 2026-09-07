import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { ApiError, apiErrorResponse } from '@/lib/http/errors';
import { h50ClosureAreas, h50ClosureSummary } from '@/lib/strategic/h50-closure';
import {
  h50IntegrationCapabilities,
  h50FirstPartyIndustryPacks,
  h50TrustControls,
  h50MobileFeatures,
  h50NorthStarKpis,
} from '@/lib/strategic/h50-platform';

export async function GET(
  request: Request,
  context: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);

    if (
      !actor.permissions.includes('organization.read') &&
      !actor.permissions.includes('strategy.read') &&
      !actor.permissions.includes('platform.read')
    ) {
      throw new ApiError(403, 'Roadmap status access is required.', 'forbidden');
    }

    return NextResponse.json({
      data: {
        release: 'H50',
        baseSha: 'ccf6d2514fc813cef0ec89fabe341f3a1b8903f8',
        closure: h50ClosureSummary(),
        areas: h50ClosureAreas,
        integrationCapabilities: h50IntegrationCapabilities,
        industryPacks: h50FirstPartyIndustryPacks,
        trustControls: h50TrustControls,
        mobileFeatures: h50MobileFeatures,
        northStarKpis: h50NorthStarKpis,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
