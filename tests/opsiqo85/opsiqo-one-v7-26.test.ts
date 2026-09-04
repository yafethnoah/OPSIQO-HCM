import { describe,expect,it } from 'vitest';
import fs from 'node:fs';
const read=(p:string)=>fs.readFileSync(p,'utf8');
describe('OPSIQO ONE V7.26 certification environment and translation closure',()=>{
  it('restores environment values after public and authenticated browser UAT',()=>{const r=read('RUN_OPSIQO_ONE_V7_26_VALIDATION.ps1');expect(r).toContain('Capture-V726Environment');expect(r).toContain('Restore-V726Environment $PublicEnvSnapshot');expect(r).toContain('Restore-V726Environment $AuthEnvSnapshot');});
  it('catalogues four employee lifecycle surfaces in four languages',()=>{const c=JSON.parse(read('src/lib/opsiqo-one/legacy-surface-translations-v7-26.json'));for(const id of ['separation','employee_relations','employee_portal','employee_profile']){expect(c[id]).toBeTruthy();for(const t of Object.values<any>(c[id].translations))expect([t.fr,t.es,t.ar].every(Boolean)).toBe(true);}});
  it('keeps authenticated accessibility coverage on the four new employee lifecycle routes',()=>{const a=read('scripts/opsiqo85-v7-26-authenticated-accessibility-smoke.mjs');for(const route of ['/employee','/employee-relations','/separations','/people/worker-001'])expect(a).toContain(`'${route}'`);});
  it('excludes obvious JSX/code artifacts from the translation inventory backlog',()=>{const s=read('scripts/opsiqo85-translation-inventory-v7-26.mjs');expect(s).toContain('codeLike');expect(s).toContain('useState\\(');expect(s).toContain('&&');});
  it('keeps the Safe Execute allowlist frozen',()=>{const s=read('src/lib/opsiqo-one/safe-execution.ts');expect((s.match(/id:'notifications\.mark_visible_read'/g)||[]).length).toBe(1);expect(s).not.toContain("id:'preference.locale.update'");expect(s).not.toContain("id:'preference.appearance.update'");});
  it('keeps consequential routing ahead of normal command patterns',()=>{const r=read('src/lib/opsiqo-one/command-router.ts');expect(r.indexOf('for(const item of blockedConsequential)')).toBeLessThan(r.indexOf('for(const item of patterns)'));});
});
