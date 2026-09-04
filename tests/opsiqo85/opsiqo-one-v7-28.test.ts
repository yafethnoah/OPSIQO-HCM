import { describe,expect,it } from 'vitest';
import fs from 'node:fs';
const read=(p:string)=>fs.readFileSync(p,'utf8');
describe('OPSIQO ONE V7.28 deployment readiness and translation closure',()=>{
  it('catalogues the V7.28 operational surfaces',()=>{const c=JSON.parse(read('src/lib/opsiqo-one/legacy-surface-translations-v7-28.json'));for(const id of ['import_center','intelligence_hub','ai_governance','agent_builder'])expect(c[id]).toBeTruthy();});
  it('keeps Safe Execute frozen to the notification action',()=>{const s=read('src/lib/opsiqo-one/safe-execution.ts');expect((s.match(/id:'notifications\.mark_visible_read'/g)||[])).toHaveLength(1);expect(s).not.toContain("id:'preference.locale.update'");});
  it('separates certification states from production deployment',()=>{const s=read('scripts/opsiqo85-v7-28-deployment-readiness-summary.mjs');expect(s).toContain('manualAccessibilityCertified');expect(s).toContain('connectorUatCertified');expect(s).toContain('productionDeployed');expect(s).not.toMatch(/firebase\s+deploy/i);});
  it('uses the actual V7.28 version in the certification ledger',()=>{const r=read('RUN_OPSIQO_ONE_V7_28_VALIDATION.ps1');expect(r).toContain("version = '7.28'");expect(r).not.toContain("version = '7.26'");});
});
