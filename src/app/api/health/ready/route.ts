import { NextResponse } from 'next/server';
import { buildReadinessSummary } from '@/lib/operations/readiness';

export const dynamic = 'force-dynamic';

export async function GET() {
  const summary = buildReadinessSummary();
  return NextResponse.json(summary, {
    status: summary.ok ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
