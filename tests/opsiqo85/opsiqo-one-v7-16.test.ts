import { describe,expect,it } from 'vitest';
import type { ActorContext,Permission } from '@/domain/security';
import { routeOpsiQoCommand } from '@/lib/opsiqo-one/command-router';
import { buildCortexPlan } from '@/lib/opsiqo-one/orchestration';
import { accessibilityReadiness,translationCoverage } from '@/lib/opsiqo-one/experience-readiness';
import { SAFE_EXECUTION_ALLOWLIST } from '@/lib/opsiqo-one/safe-execution';
function actor(role:ActorContext['role'],permissions:Permission[]):ActorContext{return{uid:'u1',orgId:'o1',role,workerId:'w1',permissions}}

describe('OPSIQO ONE v7.16 accessible multilingual program execution',()=>{
 it('routes Program Workforce only to workforce readers',()=>{const ok=routeOpsiQoCommand(actor('hr_admin',['self.read','workforce.read']),'Open program workforce');expect(ok.href).toBe('/program-workforce');expect(ok.actionLevel).toBe('recommend');const no=routeOpsiQoCommand(actor('employee',['self.read']),'Open program workforce');expect(no.mode).toBe('blocked')});
 it('routes Experience Readiness as self-scoped evidence',()=>{const r=routeOpsiQoCommand(actor('employee',['self.read']),'Show WCAG accessibility readiness');expect(r.href).toBe('/experience-readiness');expect(r.actionLevel).toBe('observe')});
 it('allows only the explicit notification-read self-service command to route to execute',()=>{const r=routeOpsiQoCommand(actor('employee',['self.read','notifications.read']),'Mark my notifications as read');expect(r.mode).toBe('execute');expect(r.actionLevel).toBe('execute');expect(r.risk).toBe('low');expect(SAFE_EXECUTION_ALLOWLIST).toHaveLength(1);expect(SAFE_EXECUTION_ALLOWLIST[0]?.id).toBe('notifications.mark_visible_read')});
 it('blocks safe execution when notification permission is absent',()=>{const r=routeOpsiQoCommand(actor('employee',['self.read']),'Mark my notifications as read');expect(r.mode).toBe('blocked')});
 it('keeps consequential employment decisions ahead of the safe execution allowlist',()=>{const r=routeOpsiQoCommand(actor('hr_admin',['self.read','notifications.read','workforce.read']),'Mark my notifications read and terminate Ahmed now');expect(r.mode).toBe('blocked');expect(r.risk).toBe('consequential');expect(r.href).toBe('/separations')});
 it('represents low-risk execution with a dedicated safe executor rather than broad Cortex Execute authority',async()=>{const a=actor('employee',['self.read','notifications.read']);const routed=routeOpsiQoCommand(a,'Mark my notifications as read');const plan=await buildCortexPlan(a,'Mark my notifications as read',routed);expect(plan.agents).toEqual(['safe-self-service']);expect(plan.effectiveMaxActionLevel).toBe('execute');expect(plan.requiresHumanCheckpoint).toBe(false);expect(plan.executionBoundary).toContain('hard-coded low-risk self-service actions')});
 it('keeps WCAG conformance as a manual certification boundary',()=>{const d=accessibilityReadiness(actor('employee',['self.read']));expect(d.target).toBe('WCAG 2.2 AA');expect(d.manualReviewRequired).toBeGreaterThan(0);expect(d.certificationBoundary).toContain('not a WCAG conformance claim')});
 it('reports four supported languages while keeping legacy translation gaps explicit',()=>{const d=translationCoverage(actor('employee',['self.read']));expect(d.supportedLocales).toEqual(['en','fr','es','ar']);expect(d.rtlLocales).toEqual(['ar']);expect(d.aiLanguagePreservesEvidence).toBe(true);expect(d.surfaces.some(x=>x.coverage==='legacy_review_required')).toBe(true)});
});
