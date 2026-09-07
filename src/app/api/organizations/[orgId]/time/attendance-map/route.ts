import { NextResponse } from 'next/server';
import {
  actorFromRequest,
  requirePermission,
} from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import {
  backfillAttendanceMapStatus,
  staffAttendanceMap,
} from '@/lib/time/attendance-map-service';

const noStoreHeaders = {
  'Cache-Control': 'no-store, max-age=0',
  'CDN-Cache-Control': 'no-store',
};

export async function GET(
  request: Request,
  context: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);

    requirePermission(actor, 'time.read');

    return NextResponse.json(
      { data: await staffAttendanceMap(actor) },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);

    requirePermission(actor, 'time.configure');

    return NextResponse.json(
      { data: await backfillAttendanceMapStatus(actor) },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
