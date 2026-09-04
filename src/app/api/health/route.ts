import { releaseIdentity } from '@/lib/release/identity';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const identity = releaseIdentity();
  return NextResponse.json({
    ok: true,
    service: 'opsiqo-hcm',
    version: process.env.OPSIQO_RELEASE_VERSION || '3.6.1',
    ...identity,
    environment: identity.deploymentEnvironment,
    timestamp: new Date().toISOString(),
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
