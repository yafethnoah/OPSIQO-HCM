import { existsSync } from 'node:fs';
import { loadEnvConfig } from '@next/env';

type Result = {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
};

async function main() {
  if (process.env.NODE_ENV !== 'production') {
    throw new Error(
      'Production preflight requires NODE_ENV=production. Run `npm run preflight:production`.',
    );
  }
  loadEnvConfig(process.cwd());
  const { buildReadinessSummary } = await import(
    '../src/lib/operations/readiness'
  );

  const readiness = buildReadinessSummary();
  const results: Result[] = readiness.checks.map((check) => ({
    name: check.code,
    status: check.status,
    message: check.message,
  }));

  results.unshift({
    name: 'production_mode',
    status: readiness.environment === 'production' ? 'pass' : 'fail',
    message: 'Production preflight must evaluate readiness with NODE_ENV=production.',
  });
  results.unshift({
    name: 'release_version',
    status: readiness.version === '3.6.1' ? 'pass' : 'fail',
    message: 'Production preflight must identify OPSIQO HCM release 3.6.1.',
  });
  results.unshift({
    name: 'dependency_lockfile',
    status: existsSync('package-lock.json') ? 'pass' : 'fail',
    message:
      'A reviewed package-lock.json is mandatory; production CI must use npm ci from that exact lockfile.',
  });

  console.log(`\nOPSIQO HCM ${readiness.version} production preflight\n`);
  for (const result of results) {
    console.log(`${result.status.toUpperCase().padEnd(5)}  ${result.name}: ${result.message}`);
  }
  const failed = results.filter((result) => result.status === 'fail');
  console.log(`\n${results.length - failed.length}/${results.length} checks non-failing; ${failed.length} critical failure(s).`);
  if (failed.length) process.exitCode = 2;
}

main().catch((error) => {
  console.error('Production preflight failed unexpectedly.');
  console.error(error);
  process.exitCode = 1;
});
