import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import {
  ontarioCompliancePayload,
  previewOntarioEmploymentStandards,
  previewOntarioSeparation,
  type OntarioEmploymentPreviewInput,
  type OntarioSeparationPreviewInput,
} from '@/lib/country-compliance/ontario-rules';

export const dynamic = 'force-dynamic';
const NO_STORE = 'private, no-store, max-age=0';

export async function GET(request: Request, context: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'regulatory.read');
    return NextResponse.json(
      { data: ontarioCompliancePayload() },
      { headers: { 'Cache-Control': NO_STORE } },
    );
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
    requirePermission(actor, 'regulatory.read');
    const body = await request.json() as { kind?: string; input?: unknown };

    if (body.kind === 'employment_standards') {
      return NextResponse.json(
        { data: previewOntarioEmploymentStandards(body.input as OntarioEmploymentPreviewInput) },
        { headers: { 'Cache-Control': NO_STORE } },
      );
    }

    if (body.kind === 'separation') {
      return NextResponse.json(
        { data: previewOntarioSeparation(body.input as OntarioSeparationPreviewInput) },
        { headers: { 'Cache-Control': NO_STORE } },
      );
    }

    return NextResponse.json(
      { error: 'Unsupported Ontario compliance preview kind.', code: 'invalid_action' },
      { status: 400, headers: { 'Cache-Control': NO_STORE } },
    );
  } catch (error) {
    const response = apiErrorResponse(error);
    response.headers.set('Cache-Control', NO_STORE);
    return response;
  }
}