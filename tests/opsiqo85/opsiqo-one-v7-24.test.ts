import { describe,expect,it } from 'vitest';
import fs from 'node:fs';
const read=(p:string)=>fs.readFileSync(p,'utf8');
describe('OPSIQO ONE V7.24 production candidate closure',()=>{
  it('keeps the Safe Execute allowlist frozen',()=>{const s=read('src/lib/opsiqo-one/safe-execution.ts');expect((s.match(/id:'notifications\.mark_visible_read'/g)||[]).length).toBe(1);expect(s).not.toContain("id:'preference.locale.update'");});
  it('keeps consequential routing before normal patterns',()=>{const r=read('src/lib/opsiqo-one/command-router.ts');expect(r.indexOf('for(const item of blockedConsequential)')).toBeLessThan(r.indexOf('for(const item of patterns)'));});
  it('catalogues Safety, Career and HR Diagnostic in four-language reviewed surfaces',()=>{const c=JSON.parse(read('src/lib/opsiqo-one/legacy-surface-translations-v7-24.json'));for(const id of ['safety','career','hr_diagnostic']){expect(c[id]).toBeTruthy();for(const t of Object.values<any>(c[id].translations))expect([t.fr,t.es,t.ar].every(Boolean)).toBe(true);}});
  it('uses locked Firebase CLI in the Windows certification runner',()=>{const r=read('RUN_OPSIQO_ONE_V7_24_VALIDATION.ps1');expect(r).toContain('npx --no-install firebase emulators:start');expect(r).toContain('Certification machine preflight');expect(r).toContain('Locked toolchain post-install preflight');});
});
