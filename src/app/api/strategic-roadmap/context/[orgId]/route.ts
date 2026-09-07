import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { queryOperationalKnowledge } from '@/lib/strategic/context-runtime';

export async function GET(
  request: Request,
  context: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    const query = new URL(request.url).searchParams.get('q') ?? '';

    return NextResponse.json({
      data: await queryOperationalKnowledge(actor, query),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
