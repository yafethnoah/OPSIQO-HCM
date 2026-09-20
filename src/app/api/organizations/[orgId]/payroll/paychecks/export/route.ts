import { actorFromRequest } from '@/lib/auth/session';
import { apiErrorResponse } from '@/lib/http/errors';
import { listPaycheckLedger } from '@/lib/payroll/paycheck-ledger';
import { paycheckLedgerExcelXml } from '@/lib/payroll/paycheck-excel';

function safeDate(value: string | null | undefined, fallback: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await context.params;
    const actor = await actorFromRequest(request, orgId);

    if (!actor.permissions.includes('payroll.export')) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'forbidden',
            message: 'Payroll export permission is required.',
          },
        }),
        {
          status: 403,
          headers: { 'content-type': 'application/json' },
        },
      );
    }

    const url = new URL(request.url);
    const asOf = safeDate(
      url.searchParams.get('asOf'),
      new Date().toISOString().slice(0, 10),
    );

    const from = url.searchParams.get('from') || undefined;
    const to = url.searchParams.get('to') || undefined;

    const data = await listPaycheckLedger(actor, {
      status: url.searchParams.get('status') || 'all',
      from,
      to,
      runId: url.searchParams.get('runId') || undefined,
      workerId: url.searchParams.get('workerId') || undefined,
      asOf,
    });

    const workbook = paycheckLedgerExcelXml(data);
    const fileStart = safeDate(from, 'all');
    const fileEnd = safeDate(to, asOf);

    return new Response(`\uFEFF${workbook}`, {
      headers: {
        'content-type': 'application/vnd.ms-excel; charset=utf-8',
        'content-disposition': `attachment; filename="OPSIQO_Paychecks_${fileStart}_to_${fileEnd}.xls"`,
        'cache-control': 'no-store, max-age=0',
        'cdn-cache-control': 'no-store',
        'x-opsiqo-row-count': String(data.rows.length),
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
