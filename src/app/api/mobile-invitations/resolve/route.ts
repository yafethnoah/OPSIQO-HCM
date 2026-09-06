import { NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/http/errors';
import { resolvePulseInvitation } from '@/lib/membership/service';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json({ data: await resolvePulseInvitation(body) }, {
      headers: {
        'Cache-Control': 'no-store, private',
        'Referrer-Policy': 'no-referrer',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}