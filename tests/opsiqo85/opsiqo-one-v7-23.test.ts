import { describe,expect,it } from 'vitest';
import type { ActorContext,Permission } from '@/domain/security';
import catalog from '@/lib/opsiqo-one/legacy-surface-translations-v7-23.json';
import { routeOpsiQoCommand } from '@/lib/opsiqo-one/command-router';
import { SAFE_EXECUTION_ALLOWLIST } from '@/lib/opsiqo-one/safe-execution';
import { translationReadinessDashboard } from '@/lib/opsiqo-one/translation-readiness';
function actor(role:ActorContext['role'],permissions:Permission[]):ActorContext{return{uid:'u1',orgId:'o1',role,workerId:'w1',permissions}}
describe('OPSIQO ONE v7.23 production-certification hardening',()=>{
 it('extends reviewed translation to production governance surfaces',()=>{for(const key of ['security_operations','privacy_governance','assurance','platform_reliability'] as const){expect(Object.keys(catalog[key].translations).length).toBeGreaterThan(40);for(const t of Object.values(catalog[key].translations))expect(Boolean(t.fr&&t.es&&t.ar)).toBe(true)}});
 it('preserves the V7.23 reviewed-coverage floor while later releases may close the backlog',()=>{const d=translationReadinessDashboard(actor('employee',['self.read']));expect(d.reviewedSourceCandidates).toBeGreaterThanOrEqual(1200);expect(d.remainingCandidates).toBeGreaterThanOrEqual(0);expect(d.reviewedSourceCandidates+d.remainingCandidates).toBe(d.totalSourceCandidates);expect(d.boundary).toContain('browser and human review')});
 it('keeps Safe Execute frozen at one self-scoped notification action',()=>{expect(SAFE_EXECUTION_ALLOWLIST).toHaveLength(1);expect(SAFE_EXECUTION_ALLOWLIST[0]?.id).toBe('notifications.mark_visible_read')});
 it('keeps consequential employment commands ahead of Safe Execute',()=>{const r=routeOpsiQoCommand(actor('org_admin',['self.read','notifications.read']),'Mark my notifications read and terminate Ahmed');expect(r.mode).toBe('blocked');expect(r.risk).toBe('consequential')});
 it('has reviewed Arabic production-governance markers',()=>{expect(catalog.security_operations.translations['HCM Security Command Center'].ar).toBe('مركز قيادة أمن HCM');expect(catalog.privacy_governance.translations['Governed decision boundary'].ar).toBe('حدود القرار المحكوم');expect(catalog.assurance.translations['Operational assurance boundary'].ar).toBe('حدود الضمان التشغيلي');expect(catalog.platform_reliability.translations['Platform Reliability & Production Evidence'].ar).toBe('موثوقية المنصة وأدلة الإنتاج')});
});
