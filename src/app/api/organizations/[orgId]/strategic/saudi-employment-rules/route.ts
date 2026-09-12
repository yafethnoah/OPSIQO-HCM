import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import {
  previewSaudiEosb,
  previewSaudiWorkLeave,
  saudiEmploymentRulesPayload,
  type SaudiEosbPreviewInput,
  type SaudiWorkLeavePreviewInput,
} from '@/lib/strategic/saudi-employment-rules';

export const dynamic = 'force-dynamic';
const NO_STORE = 'private, no-store, max-age=0';

export async function GET(request: Request, context: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'strategy.read');
    return NextResponse.json({ data: saudiEmploymentRulesPayload() }, { headers: { 'Cache-Control': NO_STORE } });
  } catch (error) {
    const response = apiErrorResponse(error);
    response.headers.set('Cache-Control', NO_STORE);
    return response;
  }
}

export async function POST(request: Request, context: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'strategy.read');
    const body = await request.json() as { kind?: string; input?: unknown };
    if (body.kind === 'eosb') {
      return NextResponse.json({ data: previewSaudiEosb(body.input as SaudiEosbPreviewInput) }, { headers: { 'Cache-Control': NO_STORE } });
    }
    if (body.kind === 'work_leave') {
      return NextResponse.json({ data: previewSaudiWorkLeave(body.input as SaudiWorkLeavePreviewInput) }, { headers: { 'Cache-Control': NO_STORE } });
    }
    return NextResponse.json({ error: 'Unsupported Saudi employment-rule preview kind.' }, { status: 400, headers: { 'Cache-Control': NO_STORE } });
  } catch (error) {
    const response = apiErrorResponse(error);
    response.headers.set('Cache-Control', NO_STORE);
    return response;
  }
}