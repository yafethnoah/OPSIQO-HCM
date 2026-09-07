import { NextResponse } from 'next/server';
import { strategicReadinessSnapshot } from '../../../../lib/strategic/readiness';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(strategicReadinessSnapshot(), {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
