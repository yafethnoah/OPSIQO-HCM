import { NextResponse } from 'next/server';
import { processResendWebhook } from '@/lib/membership/resend-webhook';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const rawBody = await request.text();
  try {
    const result = await processResendWebhook(rawBody, request.headers);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const status = message.includes('not configured') ? 503 : message.includes('JSON') ? 400 : 401;
    return NextResponse.json({ ok: false, error: 'Webhook rejected.' }, { status });
  }
}
