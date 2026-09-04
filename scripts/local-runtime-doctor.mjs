import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { resolve } from 'node:path';

const root = process.cwd();
const required = ['package.json', 'package-lock.json', 'src/lib/firebase/client.ts', 'scripts/dev-frontend-local.mjs'];
let failed = false;

for (const rel of required) {
  const ok = existsSync(resolve(root, rel));
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${rel}`);
  if (!ok) failed = true;
}

if (!failed) {
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  console.log(`INFO  package=${pkg.name}@${pkg.version}`);
}

const port = Number(process.env.PORT || '3000');
await new Promise((resolvePromise) => {
  const server = createServer();
  server.unref();
  server.once('error', (error) => {
    if (error && error.code === 'EADDRINUSE') {
      console.log(`FAIL  port ${port} is already in use (likely stale/older frontend)`);
      failed = true;
    } else {
      console.log(`FAIL  unable to probe port ${port}: ${error.message}`);
      failed = true;
    }
    resolvePromise();
  });
  server.listen({ host: '127.0.0.1', port }, () => {
    console.log(`PASS  port ${port} is available`);
    server.close(resolvePromise);
  });
});

console.log('INFO  local frontend forces Firebase emulator web config and clears .next before startup');
process.exit(failed ? 2 : 0);
