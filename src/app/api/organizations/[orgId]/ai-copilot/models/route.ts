import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { createModelProfile } from '@/lib/ai-intelligence/service';

export async function POST(request: Request, context: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'ai.manage');
    return NextResponse.json({ data: await createModelProfile(actor, await request.json()) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
