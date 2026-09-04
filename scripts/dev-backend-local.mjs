import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

const require = createRequire(import.meta.url);
const projectId = process.env.OPSIQO_LOCAL_FIREBASE_PROJECT_ID || 'demo-opsiqo-local';
const firebaseBin = require.resolve('firebase-tools/lib/bin/firebase');

console.log('[OPSIQO-LOCAL] Starting Firebase Auth, Firestore and Storage emulators.');
console.log(`[OPSIQO-LOCAL] Project ID: ${projectId}`);
console.log('[OPSIQO-LOCAL] Emulator UI: http://127.0.0.1:4000');

const child = spawn(
  process.execPath,
  [firebaseBin, 'emulators:start', '--only', 'firestore,auth,storage', '--project', projectId],
  { cwd: process.cwd(), env: { ...process.env, GCLOUD_PROJECT: projectId }, stdio: 'inherit' },
);

child.on('error', (error) => {
  console.error('[OPSIQO-LOCAL] Unable to start Firebase emulators.', error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
