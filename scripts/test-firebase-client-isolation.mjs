import { readFileSync } from 'node:fs';

const client = readFileSync('src/lib/firebase/client.ts', 'utf8');
const remote = readFileSync('src/lib/experimentation/remoteConfigAdapter.ts', 'utf8');
const analytics = readFileSync('src/lib/product-analytics/firebaseAdapter.ts', 'utf8');

const checks = [
  ['no-first-global-app-reuse', !client.includes('return getApps()[0]!')],
  ['named-local-app', client.includes('opsiqo-local-${projectId}')],
  ['named-cloud-app', client.includes('opsiqo-cloud-${projectId}')],
  ['existing-app-by-name-only', client.includes('getApps().find((app) => app.name === name)')],
  ['local-api-key-present', client.includes("apiKey: 'demo-api-key'")],
  ['auth-emulator-after-get-auth', client.includes('connectLocalAuth(auth);')],
  ['remote-config-uses-opsiqo-app', remote.includes('firebaseClientApp()') && !remote.includes('getApps()[0]')],
  ['analytics-uses-opsiqo-app', analytics.includes('firebaseClientApp()') && !analytics.includes('getApps()')],
];

for (const [id, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}`);
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) process.exit(1);
console.log(`Firebase client isolation regression: PASS (${checks.length}/${checks.length})`);
