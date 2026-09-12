import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import {
  previewSaudiContributions,
  saudiFoundationPayload,
  type SaudiContributionPreviewInput,
} from '@/lib/strategic/saudi-country-pack';

export const dynamic = 'force-dynamic';
const NO_STORE = 'private, no-store, max-age=0';

export async function GET(
  request: Request,
  context: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'strategy.read');
    return NextResponse.json(
      { data: saudiFoundationPayload() },
      { headers: { 'Cache-Control': NO_STORE } },
    );
  } catch (error) {
    const response = apiErrorResponse(error);
    response.headers.set('Cache-Control', NO_STORE);
    return response;
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'strategy.read');
    const input = await request.json() as SaudiContributionPreviewInput;
    return NextResponse.json(
      { data: previewSaudiContributions(input) },
      { headers: { 'Cache-Control': NO_STORE } },
    );
  } catch (error) {
    const response = apiErrorResponse(error);
    response.headers.set('Cache-Control', NO_STORE);
    return response;
  }
}