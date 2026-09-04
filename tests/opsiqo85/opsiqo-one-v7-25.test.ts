import { describe,expect,it } from 'vitest';
import fs from 'node:fs';
const read=(p:string)=>fs.readFileSync(p,'utf8');
describe('OPSIQO ONE V7.25 production certification closure',()=>{
  it('packages an isolated emulator configuration that cannot resolve to production',()=>{const c=JSON.parse(read('firebase.test.json'));expect(c.emulators.firestore.port).toBe(8080);expect(c.emulators.auth.port).toBe(9099);expect(c.emulators.storage.port).toBe(9199);expect(c.emulators.ui.enabled).toBe(false);expect(read('firebase.test.json')).not.toContain('opsiqo-hcm-prod-2026');});
  it('keeps the Safe Execute allowlist frozen',()=>{const s=read('src/lib/opsiqo-one/safe-execution.ts');expect((s.match(/id:'notifications\.mark_visible_read'/g)||[]).length).toBe(1);expect(s).not.toContain("id:'preference.locale.update'");expect(s).not.toContain("id:'preference.appearance.update'");});
  it('keeps consequential routing ahead of normal command patterns',()=>{const r=read('src/lib/opsiqo-one/command-router.ts');expect(r.indexOf('for(const item of blockedConsequential)')).toBeLessThan(r.indexOf('for(const item of patterns)'));});
  it('catalogues the five V7.25 production-certification surfaces in four languages',()=>{const c=JSON.parse(read('src/lib/opsiqo-one/legacy-surface-translations-v7-25.json'));for(const id of ['regulatory_change','resilience','identity','governance','enterprise_command']){expect(c[id]).toBeTruthy();for(const t of Object.values<any>(c[id].translations))expect([t.fr,t.es,t.ar].every(Boolean)).toBe(true);}});
  it('uses the isolated emulator config and a sanitized ledger in the Windows runner',()=>{const r=read('RUN_OPSIQO_ONE_V7_25_VALIDATION.ps1');expect(r).toContain('--config firebase.test.json');expect(r).toContain('--project demo-opsiqo-local');expect(r).toContain('v7-25-certification-ledger.json');expect(r).not.toMatch(/firebase\s+deploy|apphosting:rollouts:create|gcloud\s+(?:run\s+)?deploy/i);});
});
