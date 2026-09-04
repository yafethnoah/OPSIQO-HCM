import { describe,expect,it } from 'vitest';
import type { ActorContext,Permission } from '@/domain/security';
import catalog from '@/lib/opsiqo-one/legacy-surface-translations-v7-18.json';
import { routeOpsiQoCommand } from '@/lib/opsiqo-one/command-router';
import { executionUatDashboard } from '@/lib/opsiqo-one/execution-uat';
import { SAFE_EXECUTION_ALLOWLIST } from '@/lib/opsiqo-one/safe-execution';
import { translationReadinessDashboard } from '@/lib/opsiqo-one/translation-readiness';
function actor(role:ActorContext['role'],permissions:Permission[]):ActorContext{return{uid:'u1',orgId:'o1',role,workerId:'w1',permissions}}
describe('OPSIQO ONE v7.18 UAT accessibility translation certification',()=>{
 it('routes translation backlog only to signed-in self readers',()=>{const ok=routeOpsiQoCommand(actor('employee',['self.read']),'Show translation readiness backlog');expect(ok.href).toBe('/translation-readiness');expect(ok.actionLevel).toBe('observe');const no=routeOpsiQoCommand(actor('employee',[]),'Show translation readiness backlog');expect(no.mode).toBe('blocked')});
 it('keeps safe Execute expansion on hold',()=>{const d=executionUatDashboard();expect(SAFE_EXECUTION_ALLOWLIST).toHaveLength(1);expect(SAFE_EXECUTION_ALLOWLIST[0]?.id).toBe('notifications.mark_visible_read');expect(d.expansionStatus).toBe('hold');expect(d.candidateActionIds).toEqual(['preference.locale.update','preference.appearance.update'])});
 it('exposes implementation and browser UAT gates separately',()=>{const d=executionUatDashboard();expect(d.implementationGates.length).toBeGreaterThanOrEqual(7);expect(d.implementationGates.every(x=>x.status==='implementation_pass')).toBe(true);expect(d.browserGates.every(x=>x.status==='browser_uat_required')).toBe(true)});
 it('keeps consequential decisions ahead of safe execution and translation routing',()=>{const r=routeOpsiQoCommand(actor('org_admin',['self.read','notifications.read']),'Mark my notifications read and terminate Ahmed');expect(r.mode).toBe('blocked');expect(r.risk).toBe('consequential');expect(r.href).toBe('/separations')});
 it('catalogues four selected surfaces with complete FR/ES/AR entries',()=>{expect(Object.keys(catalog).sort()).toEqual(['notifications','settings','setup','signin']);for(const surface of Object.values(catalog))for(const t of Object.values(surface.translations))expect(Boolean(t.fr&&t.es&&t.ar)).toBe(true)});
 it('preserves translation readiness evidence when later releases close the measured backlog',()=>{const d=translationReadinessDashboard(actor('employee',['self.read']));expect(d.reviewedSourceCandidates).toBeGreaterThan(0);expect(d.remainingCandidates).toBeGreaterThanOrEqual(0);expect(d.reviewedSourceCandidates+d.remainingCandidates).toBe(d.totalSourceCandidates);expect(d.boundary).toContain('browser and human review')});
});
