import { NextResponse } from 'next/server';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { executeUatReset, getAdminMaintenanceSnapshot, refreshOrganizationCache, safeCleanup } from '@/lib/admin-maintenance/service';

const NO_STORE = 'private, no-store, max-age=0';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    return NextResponse.json({ data: await getAdminMaintenanceSnapshot(actor) }, { headers: { 'Cache-Control': NO_STORE } });
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
    const body = await request.json();
    const action = String(body?.action || '');
    const data = action === 'safe_cleanup'
      ? await safeCleanup(actor)
      : action === 'refresh_cache'
        ? await refreshOrganizationCache(actor)
        : action === 'execute_uat_reset'
          ? await executeUatReset(actor, String(body?.confirmation || ''))
          : action === 'health_check'
            ? await getAdminMaintenanceSnapshot(actor)
            : null;
    if (!data) return NextResponse.json({ error: { code: 'invalid_action', message: 'Unsupported maintenance action.' } }, { status: 400, headers: { 'Cache-Control': NO_STORE } });
    return NextResponse.json({ data }, { headers: { 'Cache-Control': NO_STORE } });
  } catch (error) {
    const response = apiErrorResponse(error);
    response.headers.set('Cache-Control', NO_STORE);
    return response;
  }
}
