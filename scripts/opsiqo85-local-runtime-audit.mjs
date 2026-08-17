import { readFileSync } from 'node:fs';

const checks = [];
const add = (id, ok) => checks.push({ id, status: ok ? 'PASS' : 'FAIL' });
const client = readFileSync('src/lib/firebase/client.ts', 'utf8');
const nextConfig = readFileSync('next.config.ts', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const frontend = readFileSync('scripts/dev-frontend-local.mjs', 'utf8');
const backend = readFileSync('scripts/dev-backend-local.mjs', 'utf8');

add('auth-emulator-connected-before-use', client.includes('connectAuthEmulator(auth, url') && client.indexOf('connectAuthEmulator(auth, url') < client.indexOf('return auth;'));
add('emulator-config-does-not-require-real-api-key', client.includes("'demo-api-key'"));
add('firebase-client-isolated-from-stale-default-app', client.includes('clientAppName(options)') && client.includes('getApps().find((app) => app.name === name)') && !client.includes('return getApps()[0]!'));
add('cloud-config-fails-actionably', client.includes('[OPSIQO-FIREBASE] Missing client configuration'));
add('app-check-disabled-only-explicit-emulator-mode', client.includes("typeof window === 'undefined' || firebaseEmulatorMode()") && client.includes("process.env.NODE_ENV === 'production'") && client.includes("projectId === 'demo-opsiqo-local'"));
add('frontend-injects-admin-emulator-hosts', frontend.includes('FIRESTORE_EMULATOR_HOST') && frontend.includes('FIREBASE_AUTH_EMULATOR_HOST') && frontend.includes('FIREBASE_STORAGE_EMULATOR_HOST'));
add('frontend-injects-browser-auth-emulator', frontend.includes('NEXT_PUBLIC_OPSIQO_USE_FIREBASE_EMULATORS') && frontend.includes('NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL'));
add('backend-uses-demo-project', backend.includes("'demo-opsiqo-local'") && backend.includes("'--project'"));
add('next16-local-origin-support', nextConfig.includes('allowedDevOrigins: localDevOrigins') && nextConfig.includes('networkInterfaces'));
add('standard-dev-frontend-is-local-safe', pkg.scripts?.['dev:frontend'] === 'node scripts/dev-frontend-local.mjs');
add('cloud-development-remains-explicit', pkg.scripts?.['dev:frontend:cloud'] === 'next dev');

const failed = checks.filter((check) => check.status === 'FAIL');
console.table(checks);
console.log(`OPSIQO local runtime audit: ${failed.length ? 'FAIL' : 'PASS'} (${checks.length - failed.length}/${checks.length})`);
if (failed.length) process.exit(1);
