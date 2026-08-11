import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { actModelProfile } from '@/lib/ai-intelligence/service';

export async function PATCH(request: Request, context: { params: Promise<{ orgId: string; modelId: string }> }) {
  try {
    const { orgId, modelId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'ai.approve');
    return NextResponse.json({ data: await actModelProfile(actor, modelId, await request.json()) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
