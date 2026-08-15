import type { NextConfig } from 'next';
import { networkInterfaces } from 'node:os';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self), payment=(), usb=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
    : []),
];

const localDevOrigins = (() => {
  if (process.env.NODE_ENV === 'production') return [] as string[];
  const fromInterfaces = Object.values(networkInterfaces())
    .flatMap((entries) => entries || [])
    .filter((entry) => entry.family === 'IPv4' && !entry.internal)
    .map((entry) => entry.address);
  const configured = String(process.env.OPSIQO_ALLOWED_DEV_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return Array.from(new Set(['localhost', '127.0.0.1', ...fromInterfaces, ...configured]));
})();

const nextConfig: NextConfig = {
  allowedDevOrigins: localDevOrigins,
  poweredByHeader: false,
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    useTypeScriptCli: true,
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
