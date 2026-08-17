import { rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const projectId = process.env.OPSIQO_LOCAL_FIREBASE_PROJECT_ID || 'demo-opsiqo-local';
const localAdminEmail = process.env.OPSIQO_LOCAL_ADMIN_EMAIL || 'admin@opsiqo.local';

const env = {
  ...process.env,
  NODE_ENV: 'development',
  GCLOUD_PROJECT: projectId,
  FIREBASE_PROJECT_ID: projectId,
  FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080',
  FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099',
  FIREBASE_STORAGE_EMULATOR_HOST: process.env.FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199',
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,

  NEXT_PUBLIC_OPSIQO_USE_FIREBASE_EMULATORS: 'true',
  NEXT_PUBLIC_OPSIQO_DEMO_MODE: 'false',
  OPSIQO_DEMO_MODE: 'false',
  // In local emulator mode, deliberately override any stale/cloud values that
  // may be present in the parent PowerShell environment.
  NEXT_PUBLIC_FIREBASE_API_KEY: 'demo-api-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${projectId}.firebaseapp.com`,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: projectId,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: `${projectId}.appspot.com`,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '1234567890',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:1234567890:web:opsiqo-local',
  NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL: 'http://127.0.0.1:9099',

  // Local-only onboarding for the empty emulator data set. These values are
  // injected into this child process and are never written to .env files.
  NEXT_PUBLIC_OPSIQO_REGISTRATION_MODE: process.env.NEXT_PUBLIC_OPSIQO_REGISTRATION_MODE || 'open_auth_only',
  OPSIQO_ALLOW_FIRST_ORG_BOOTSTRAP: process.env.OPSIQO_ALLOW_FIRST_ORG_BOOTSTRAP || 'true',
  OPSIQO_LOCAL_FIRST_USER_BOOTSTRAP: process.env.OPSIQO_LOCAL_FIRST_USER_BOOTSTRAP || 'true',
  OPSIQO_BOOTSTRAP_ADMIN_EMAIL: process.env.OPSIQO_BOOTSTRAP_ADMIN_EMAIL || localAdminEmail,
  OPSIQO_BOOTSTRAP_REQUIRE_VERIFIED_EMAIL: process.env.OPSIQO_BOOTSTRAP_REQUIRE_VERIFIED_EMAIL || 'false',
  APP_BASE_URL: process.env.APP_BASE_URL || 'http://localhost:3000',
  NEXT_PUBLIC_APP_BASE_URL: process.env.NEXT_PUBLIC_APP_BASE_URL || 'http://localhost:3000',
  OPSIQO_AI_PROVIDER: process.env.OPSIQO_AI_PROVIDER || 'demo',
};

if (process.env.OPSIQO_DEV_KEEP_NEXT_CACHE !== 'true') {
  rmSync(join(process.cwd(), '.next'), { recursive: true, force: true });
  console.log('[OPSIQO-LOCAL] Cleared transient .next development cache.');
}

console.log('[OPSIQO-LOCAL] Starting Next.js against Firebase Local Emulator Suite.');
console.log(`[OPSIQO-LOCAL] Project ID: ${projectId}`);
console.log(`[OPSIQO-LOCAL] Auth:      http://${env.FIREBASE_AUTH_EMULATOR_HOST}`);
console.log(`[OPSIQO-LOCAL] Firestore: http://${env.FIRESTORE_EMULATOR_HOST}`);
console.log(`[OPSIQO-LOCAL] Storage:   http://${env.FIREBASE_STORAGE_EMULATOR_HOST}`);
console.log('[OPSIQO-LOCAL] First-organization bootstrap: first authenticated local-emulator identity may claim an empty data set.');
console.log(`[OPSIQO-LOCAL] Preferred local admin email: ${localAdminEmail}`);
console.log('[OPSIQO-LOCAL] Open http://localhost:3000/register, authenticate, then continue to /setup.');

const requestedPort = Number(process.env.PORT || '3000');

async function ensurePortAvailable(port) {
  await new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.once('error', (error) => {
      if (error && error.code === 'EADDRINUSE') {
        reject(new Error(
          `[OPSIQO-LOCAL] Port ${port} is already in use. A stale/older Next.js server may still be running. ` +
          `Stop that frontend process before starting this project.`
        ));
        return;
      }
      reject(error);
    });
    server.listen({ host: '127.0.0.1', port }, () => {
      server.close(resolve);
    });
  });
}

await ensurePortAvailable(requestedPort);

const nextBin = require.resolve('next/dist/bin/next');
const child = spawn(process.execPath, [nextBin, 'dev', '--port', String(requestedPort), ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env,
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error('[OPSIQO-LOCAL] Unable to start Next.js.', error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
