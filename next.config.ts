import type { NextConfig } from 'next';
import { networkInterfaces } from 'node:os';

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  process.env.NODE_ENV === 'production'
    ? "script-src 'self' 'unsafe-inline' https://www.gstatic.com https://www.google.com https://www.recaptcha.net"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://www.google.com https://www.recaptcha.net",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  process.env.NODE_ENV === 'production'
    ? "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://*.google.com https://*.gstatic.com wss://*.firebaseio.com wss://*.googleapis.com"
    : "connect-src 'self' http://127.0.0.1:8080 http://127.0.0.1:9099 http://127.0.0.1:9199 http://localhost:8080 http://localhost:9099 http://localhost:9199 https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://*.google.com https://*.gstatic.com wss://*.firebaseio.com wss://*.googleapis.com",
  "frame-src 'self' https://www.google.com https://www.recaptcha.net",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  ...(process.env.NODE_ENV === 'production' ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
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
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        source: '/opsiqo-sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default nextConfig;
