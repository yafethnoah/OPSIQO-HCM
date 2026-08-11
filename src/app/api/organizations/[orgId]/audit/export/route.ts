import { actorFromRequest, requirePermission } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { listAudit } from '@/lib/audit/query';

function csvCell(value: unknown) {
  const text = value == null ? '' : typeof value === 'string' ? value : JSON.stringify(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request, context: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    requirePermission(actor, 'audit.export');
    const url = new URL(request.url);
    const rows = await listAudit(actor, {
      limit: Math.min(500, Number(url.searchParams.get('limit') || 500)),
      action: url.searchParams.get('action') || undefined,
      entityType: url.searchParams.get('entityType') || undefined,
      actorUid: url.searchParams.get('actorUid') || undefined,
      from: url.searchParams.get('from') || undefined,
      to: url.searchParams.get('to') || undefined,
    });
    const header = ['createdAt','action','entityType','entityId','actorUid','actorRole','before','after','metadata'];
    const csv = [header.join(','), ...rows.map((row: any) => header.map((key) => csvCell(row[key])).join(','))].join('\n');
    return new Response(csv, { headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="opsiqo-audit-${new Date().toISOString().slice(0,10)}.csv"`,
      'Cache-Control': 'no-store',
    }});
  } catch (error) {
    return apiErrorResponse(error);
  }
}
