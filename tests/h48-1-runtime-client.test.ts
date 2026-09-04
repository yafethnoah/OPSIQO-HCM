import { describe,expect,it } from 'vitest';
import fs from 'node:fs';

const read=(p:string)=>fs.readFileSync(p,'utf8');

describe('H48.1 runtime client stability',()=>{
  it('uses Next Script for the pre-hydration locale bootstrap',()=>{
    const source=read('src/components/runtime-locale-bootstrap.tsx');
    expect(source).toContain("from 'next/script'");
    expect(source).toContain('strategy="beforeInteractive"');
    expect(source).not.toContain('return <script');
  });

  it('cleans stale OPSIQO service workers during development',()=>{
    const source=read('src/components/pwa-registrar.tsx');
    expect(source).toContain("process.env.NODE_ENV!=='production'");
    expect(source).toContain('getRegistrations');
    expect(source).toContain('unregister()');
    expect(source).toContain('caches.delete');
  });

  it('never service-worker-caches Next runtime chunks',()=>{
    const source=read('public/opsiqo-sw.js');
    expect(source).toContain("if(url.pathname.startsWith('/_next/'))return");
    expect(source).toContain("if(url.pathname.startsWith('/api/'))return");
  });
});
