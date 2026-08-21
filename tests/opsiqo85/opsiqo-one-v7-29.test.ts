import { describe,it,expect } from 'vitest';import fs from 'node:fs';
const read=(p:string)=>fs.readFileSync(p,'utf8');
describe('OPSIQO ONE V7.29 final release attestation',()=>{
 it('uses conflict-safe global reviewed translations',()=>{const s=read('src/lib/opsiqo-one/legacy-surface-i18n.ts');expect(s).toContain('buildGlobalReviewedTranslations');expect(s).toContain('pool.set(source,null)');expect(s).toContain('useGlobalReviewedTranslation');});
 it('never expands Safe Execute',()=>{const s=read('src/lib/opsiqo-one/safe-execution.ts');expect((s.match(/id:'notifications\.mark_visible_read'/g)||[]).length).toBe(1);expect(s).not.toContain("id:'preference.locale.update'");});
 it('requires explicit human release evidence',()=>{const s=read('scripts/opsiqo85-v7-29-final-release-attestation.mjs');for(const k of ['manualAccessibility','connectorUat','releaseChangeApproval','productionDeployment'])expect(s).toContain(k);});
 it('contains no production deployment in certification runner',()=>{const s=read('RUN_OPSIQO_ONE_V7_29_VALIDATION.ps1');expect(s).not.toMatch(/firebase\s+deploy|apphosting:rollouts:create|gcloud\s+(?:run\s+)?deploy/i);});
});
