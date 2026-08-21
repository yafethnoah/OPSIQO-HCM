import { describe,expect,it } from 'vitest';
import fs from 'node:fs';
const read=(p:string)=>fs.readFileSync(p,'utf8');
describe('OPSIQO ONE V7.27 final certification and translation closure',()=>{
  it('catalogues five high-value AI/analytics/security surfaces in four languages',()=>{const c=JSON.parse(read('src/lib/opsiqo-one/legacy-surface-translations-v7-27.json'));for(const id of ['ai_copilot','people_analytics','scenario_lab','ai_value','mfa_setup']){expect(c[id]).toBeTruthy();for(const t of Object.values<any>(c[id].translations))expect([t.fr,t.es,t.ar].every(Boolean)).toBe(true);}});
  it('keeps authenticated browser coverage for the new V7.27 routes',()=>{const a=read('scripts/opsiqo85-v7-27-authenticated-accessibility-smoke.mjs');for(const route of ['/ai-copilot','/people-analytics','/scenario-lab','/ai-value','/mfa/setup'])expect(a).toContain(`'${route}'`);});
  it('hardens translation inventory against code fragments',()=>{const s=read('scripts/opsiqo85-translation-inventory-v7-27.mjs');for(const token of ['===','Array<','codeLike'])expect(s).toContain(token);});
  it('prints a dependency-free safe certification summary on failures',()=>{const r=read('RUN_OPSIQO_ONE_V7_27_VALIDATION.ps1');const s=read('scripts/opsiqo85-v7-27-certification-summary.mjs');expect((r.match(/opsiqo85-v7-27-certification-summary\.mjs/g)||[]).length).toBeGreaterThanOrEqual(4);expect(s).toContain('First failing gate:');expect(s).toContain('never reads .env files');});
  it('checks safe registry/path diagnostics without exposing npm credentials',()=>{const p=read('scripts/opsiqo85-v7-27-certification-preflight.mjs');expect(p).toContain('npm-registry-host');expect(p).toContain('windows-url-encoded-path');expect(p).toContain('windows-onedrive-path');expect(p).toContain('u.host');expect(p).not.toContain('u.password');});
  it('does not duplicate historical targeted test gates',()=>{const r=read('RUN_OPSIQO_ONE_V7_27_VALIDATION.ps1');expect((r.match(/Step 'V7\.21 targeted tests'/g)||[]).length).toBe(1);});
  it('keeps the Safe Execute allowlist frozen',()=>{const s=read('src/lib/opsiqo-one/safe-execution.ts');expect((s.match(/id:'notifications\.mark_visible_read'/g)||[]).length).toBe(1);expect(s).not.toContain("id:'preference.locale.update'");expect(s).not.toContain("id:'preference.appearance.update'");});
  it('keeps consequential routing ahead of normal command patterns',()=>{const r=read('src/lib/opsiqo-one/command-router.ts');expect(r.indexOf('for(const item of blockedConsequential)')).toBeLessThan(r.indexOf('for(const item of patterns)'));});
});
