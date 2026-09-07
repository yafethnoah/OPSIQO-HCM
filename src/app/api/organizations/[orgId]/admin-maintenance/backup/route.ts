import { Readable } from 'node:stream';
import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { createOrganizationBackup } from '@/lib/admin-maintenance/backup';

const NO_STORE = 'private, no-store, max-age=0';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: Request,
  context: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);
    const body = await request.json();
    const backup = await createOrganizationBackup(actor, body);
    const webStream = Readable.toWeb(backup.stream);

    return new Response(webStream as unknown as ReadableStream<Uint8Array>, {
      status: 200,
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${backup.fileName}"`,
        'Cache-Control': NO_STORE,
        'X-Content-Type-Options': 'nosniff',
        'X-OPSIQO-Backup-Id': backup.backupId,
      },
    });
  } catch (error) {
    const response = apiErrorResponse(error);
    response.headers.set('Cache-Control', NO_STORE);
    return response;
  }
}
