import { NextResponse } from 'next/server';
import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { listAudit } from '@/lib/audit/query';

export async function GET(request: Request, context: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'audit.read');
    const url = new URL(request.url);
    return NextResponse.json({ data: await listAudit(actor, {
      limit: Number(url.searchParams.get('limit') || 100),
      action: url.searchParams.get('action') || undefined,
      entityType: url.searchParams.get('entityType') || undefined,
      actorUid: url.searchParams.get('actorUid') || undefined,
      from: url.searchParams.get('from') || undefined,
      to: url.searchParams.get('to') || undefined,
    }) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
