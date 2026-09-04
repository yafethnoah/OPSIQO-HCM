import { describe,it,expect } from 'vitest';import fs from 'node:fs';
const read=(p:string)=>fs.readFileSync(p,'utf8');
describe('OPSIQO ONE V7.30 final source closure',()=>{
 it('keeps consequential action routing ahead of normal routing',()=>{const s=read('src/lib/opsiqo-one/command-router.ts');expect(s.indexOf('for(const item of blockedConsequential)')).toBeLessThan(s.indexOf('for(const item of patterns)'))});
 it('keeps Safe Execute limited to directly targeted notification-read state',()=>{const s=read('src/lib/opsiqo-one/safe-execution.ts');expect((s.match(/id:'notifications\.mark_visible_read'/g)||[]).length).toBe(1);expect(s).not.toContain("id:'preference.locale.update'")});
 it('requires validated human evidence before production attestation',()=>{const s=read('scripts/opsiqo85-v7-30-final-release-attestation.mjs');expect(s).toContain('validateHumanSignoff');expect(s).toContain('productionDeploymentApproved')});
 it('uses the V7.30 or later translation catalog',()=>{const s=read('src/lib/opsiqo-one/legacy-surface-i18n.ts');const active=Number(s.match(/legacy-surface-translations-v7-(\d+)\.json/)?.[1]||0);expect(active).toBeGreaterThanOrEqual(30)});
});
