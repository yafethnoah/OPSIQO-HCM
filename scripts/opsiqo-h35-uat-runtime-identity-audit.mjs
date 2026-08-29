import fs from 'node:fs';

const checks = [];
const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });
const text = (path) => fs.readFileSync(path, 'utf8');

const readiness = text('src/lib/operations/readiness.ts');
const helper = text('src/lib/runtime/deployment-environment.ts');
const health = text('src/app/api/health/route.ts');
const identity = text('src/lib/release/identity.ts');
const uat = text('apphosting.uat.yaml');
const test = text('tests/opsiqo85/opsiqo-one-v7-35-uat-runtime-identity.test.ts');

add('Readiness no longer equates NODE_ENV production with OPSIQO production', !readiness.includes("const production = process.env.NODE_ENV === 'production'"));
add('Readiness uses explicit deployment-environment helper', readiness.includes('isProductionDeployment()'));
add('Readiness exposes runtime mode separately', readiness.includes('runtimeMode: runtimeMode()'));
add('Deployment helper supports explicit OPSIQO_ENVIRONMENT', helper.includes('process.env.OPSIQO_ENVIRONMENT'));
add('Deployment helper conservatively recognizes UAT project identity', helper.includes("return 'uat'"));
add('Production remains explicit/fail-closed', helper.includes("return 'production'"));
add('Health separates deployment environment from runtime mode', health.includes('identity.deploymentEnvironment'));
add('Release identity tells operators where commit evidence comes from', identity.includes('app_hosting_rollout_history'));
add('UAT App Hosting override exists', uat.includes('OPSIQO_ENVIRONMENT') && uat.includes('value: uat'));
add('UAT canonical base URL is declared', uat.includes('https://uat.opsiqo.ca'));
add('Targeted regression covers UAT and production behavior', test.includes('keeps production fail-closed') && test.includes('allows UAT readiness'));

let passed = 0;
for (const check of checks) {
  const status = check.ok ? 'PASS' : 'FAIL';
  console.log(status.padEnd(5), check.name);
  if (check.ok) passed++;
}

console.log('');
console.log(`H35 UAT RUNTIME IDENTITY AUDIT: ${passed}/${checks.length} PASS`);

if (passed !== checks.length) process.exit(1);
