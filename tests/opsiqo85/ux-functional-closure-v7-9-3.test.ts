import { describe,expect,it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
describe('OPSIQO 8.5 V7.9.3 UX functional closure',()=>{
  const nav=fs.readFileSync('src/components/nav.tsx','utf8');
  it('makes Home the default entry point',()=>{expect(fs.readFileSync('src/app/page.tsx','utf8')).toContain("redirect('/home')");expect(nav.indexOf("label:'Home'")).toBeLessThan(nav.indexOf("label:'HR Overview'"));});
  it('keeps every literal navigation destination routable and unique',()=>{const hrefs=[...nav.matchAll(/href:'([^']+)'/g)].map(m=>m[1]);expect(new Set(hrefs).size).toBe(hrefs.length);for(const href of hrefs)expect(fs.existsSync(path.join(process.cwd(),'src','app',href.slice(1),'page.tsx')),href).toBe(true);});
  it('keeps advanced navigation collapsed until needed',()=>{expect(nav).toContain("{ area:'more', label:'More', defaultClosed:true }");expect(nav).toContain("{ area:'admin', label:'Admin & Platform', defaultClosed:true }");});
  it('keeps Employee Portal directly discoverable',()=>{expect(nav).toContain("href:'/employee'");});
  it('adds keyboard navigation affordances',()=>{const shell=fs.readFileSync('src/components/app-shell.tsx','utf8');expect(shell).toContain('Skip to main content');expect(shell).toContain('id="main-content"');expect(shell).toContain('tabIndex={-1}');expect(nav).toContain('aria-current');});
});
