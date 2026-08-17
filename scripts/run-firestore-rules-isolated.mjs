import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const host = '127.0.0.1';
const candidatePorts = [8180, 8181, 8182, 8183, 8184, 8185, 8186, 8187, 8188, 8189];

function canListen(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once('error', () => resolve(false));
    server.listen({ host, port }, () => {
      server.close(() => resolve(true));
    });
  });
}

let port = null;
for (const candidate of candidatePorts) {
  if (await canListen(candidate)) {
    port = candidate;
    break;
  }
}
if (!port) {
  console.error('[OPSIQO-RULES] No isolated Firestore test port is available in 8180-8189.');
  process.exit(2);
}

const configPath = path.join(root, `.firebase-rules-test.${process.pid}.json`);
const config = {
  firestore: {
    rules: 'firestore.rules',
    indexes: 'firestore.indexes.json'
  },
  emulators: {
    firestore: { host, port },
    ui: { enabled: false },
    singleProjectMode: true
  }
};
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

const firebaseJs = path.join(root, 'node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js');
if (!fs.existsSync(firebaseJs)) {
  console.error(`[OPSIQO-RULES] Firebase CLI entry point not found at ${firebaseJs}. Run npm ci first.`);
  try { fs.unlinkSync(configPath); } catch {}
  process.exit(3);
}

console.log(`[OPSIQO-RULES] Using isolated Firestore emulator at ${host}:${port}.`);
console.log('[OPSIQO-RULES] Existing development emulator on 8080, if any, will not be touched.');
console.log('[OPSIQO-RULES] Launching Firebase CLI with shell-free argument passing.');

const firebaseArgs = [
  firebaseJs,
  'emulators:exec',
  '--project', 'demo-opsiqo-rules-test',
  '--config', configPath,
  '--only', 'firestore',
  'vitest run tests/firestore.rules.test.ts'
];

const child = spawn(process.execPath, firebaseArgs, {
  cwd: root,
  stdio: 'inherit',
  shell: false,
  windowsHide: false,
  env: {
    ...process.env,
    GCLOUD_PROJECT: 'demo-opsiqo-rules-test',
    GOOGLE_CLOUD_PROJECT: 'demo-opsiqo-rules-test'
  }
});

const exitCode = await new Promise((resolve) => {
  child.on('error', (error) => {
    console.error(`[OPSIQO-RULES] Failed to start isolated rules test: ${error.message}`);
    resolve(4);
  });
  child.on('exit', (code, signal) => {
    if (signal) {
      console.error(`[OPSIQO-RULES] Rules test terminated by signal ${signal}.`);
      resolve(5);
      return;
    }
    resolve(code ?? 1);
  });
});

try { fs.unlinkSync(configPath); } catch {}
process.exit(exitCode);
