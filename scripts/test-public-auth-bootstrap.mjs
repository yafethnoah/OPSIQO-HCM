import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const layout = read('src/app/layout.tsx');
const shell = read('src/components/app-shell.tsx');
const firebase = read('src/lib/firebase/client.ts');

const checks = [
  ['root layout delegates to AppShell', layout.includes('<AppShell>{children}</AppShell>')],
  ['root layout does not directly mount Nav', !layout.includes('<Nav />')],
  ['register route bypasses authenticated shell', shell.includes("'/register'")],
  ['signin route bypasses authenticated shell', shell.includes("'/signin'")],
  ['forgot password bypasses authenticated shell', shell.includes("'/forgot-password'")],
  ['invite acceptance bypasses authenticated shell', shell.includes("'/accept-invite'")],
  ['setup bypasses organization switcher bootstrap', shell.includes("'/setup'")],
  ['authenticated routes still mount Nav', shell.includes('<Nav />')],
  ['firebase client never reuses first app by position', !/return\s+getApps\(\)\s*\[\s*0\s*\]/.test(firebase)],
  ['local demo fallback is development-only', firebase.includes("process.env.NODE_ENV === 'production'") && firebase.includes("projectId === 'demo-opsiqo-local'")],
  ['auth validates runtime config before getAuth', firebase.includes('apiKeyShapeValid') && firebase.indexOf('apiKeyShapeValid') < firebase.lastIndexOf('getAuth(app)')],
];

let failures = 0;
for (const [name, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
  if (!pass) failures += 1;
}
console.log(`\nPublic auth/bootstrap regression: ${checks.length - failures}/${checks.length} passed`);
if (failures) process.exit(1);
