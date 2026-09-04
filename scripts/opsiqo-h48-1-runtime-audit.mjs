import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');
const checks=[];
const add=(name,pass)=>checks.push({name,pass:Boolean(pass)});

const locale=read('src/components/runtime-locale-bootstrap.tsx');
const registrar=read('src/components/pwa-registrar.tsx');
const sw=read('public/opsiqo-sw.js');
const next=read('next.config.ts');

add('Locale bootstrap uses next/script',locale.includes("from 'next/script'")&&locale.includes('strategy="beforeInteractive"'));
add('Locale bootstrap no longer returns raw script tag',!locale.includes('return <script'));
add('Development unregisters stale service workers',registrar.includes("process.env.NODE_ENV!=='production'")&&registrar.includes('getRegistrations')&&registrar.includes('unregister()'));
add('Development clears OPSIQO static caches',registrar.includes("startsWith(OPSIQO_CACHE_PREFIX)")&&registrar.includes('caches.delete'));
add('Production registration bypasses SW HTTP cache',registrar.includes("updateViaCache:'none'"));
add('Service worker does not cache Next chunks',sw.includes("if(url.pathname.startsWith('/_next/'))return"));
add('Service worker keeps API cache exclusion',sw.includes("if(url.pathname.startsWith('/api/'))return"));
add('Service worker cache version bumped',sw.includes("const CACHE='opsiqo-static-h48-1'"));
add('Service worker script is served no-store',next.includes("source: '/opsiqo-sw.js'")&&next.includes('no-cache, no-store, must-revalidate'));

const failures=checks.filter((x)=>!x.pass);
for(const check of checks)console.log(`${check.pass?'PASS':'FAIL'}  ${check.name}`);
console.log(`\nH48.1 runtime/client audit: ${checks.length-failures.length}/${checks.length} PASS`);
if(failures.length)process.exit(1);
