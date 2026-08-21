import { describe,expect,it } from 'vitest';
import type { ActorContext,Permission } from '@/domain/security';
import { routeOpsiQoCommand } from '@/lib/opsiqo-one/command-router';
import { accessibilityReadiness,translationCoverage } from '@/lib/opsiqo-one/experience-readiness';
import { executionReadinessDashboard } from '@/lib/opsiqo-one/execution-readiness';
import { SAFE_EXECUTION_ALLOWLIST } from '@/lib/opsiqo-one/safe-execution';
import { MEETING_WORKFLOW_TEMPLATES } from '@/lib/opsiqo-one/meeting-actions';
function actor(role:ActorContext['role'],permissions:Permission[]):ActorContext{return{uid:'u1',orgId:'o1',role,workerId:'w1',permissions}}

describe('OPSIQO ONE v7.17 accessibility translation portfolio execution',()=>{
 it('routes Program Portfolio only to workforce readers',()=>{const ok=routeOpsiQoCommand(actor('hr_admin',['self.read','workforce.read']),'Show program portfolio budget actuals');expect(ok.href).toBe('/program-portfolio');expect(ok.actionLevel).toBe('recommend');const no=routeOpsiQoCommand(actor('employee',['self.read']),'Show program portfolio budget actuals');expect(no.mode).toBe('blocked')});
 it('keeps the safe Execute allowlist unchanged pending UAT',()=>{const d=executionReadinessDashboard();expect(SAFE_EXECUTION_ALLOWLIST).toHaveLength(1);expect(SAFE_EXECUTION_ALLOWLIST.map(x=>x.id)).toEqual(['notifications.mark_visible_read']);expect(d.enabledActions.map(x=>x.id)).toEqual(SAFE_EXECUTION_ALLOWLIST.map(x=>x.id));expect(d.candidates.length).toBeGreaterThan(0);expect(d.candidates.every(x=>x.status==='hold_for_uat')).toBe(true)});
 it('exposes three disabled Meeting to Workflow templates',()=>{expect(MEETING_WORKFLOW_TEMPLATES.map(x=>x.id)).toEqual(['action_register','sequenced_follow_up','review_gate']);expect(MEETING_WORKFLOW_TEMPLATES.every(x=>x.createsDisabledWorkflow&&x.requiresSeparateActivation)).toBe(true)});
 it('keeps consequential employment decisions ahead of portfolio and safe actions',()=>{const r=routeOpsiQoCommand(actor('hr_admin',['self.read','workforce.read','notifications.read']),'Show program portfolio and terminate Ahmed now');expect(r.mode).toBe('blocked');expect(r.risk).toBe('consequential');expect(r.href).toBe('/separations')});
 it('adds browser-backed accessibility evidence without claiming conformance',()=>{const d=accessibilityReadiness(actor('employee',['self.read']));expect(d.evidence.some(x=>x.evidence.includes('Chromium-backed public-route smoke'))).toBe(true);expect(d.manualReviewRequired).toBeGreaterThan(0);expect(d.certificationBoundary).toContain('not a WCAG conformance claim')});
 it('marks translated V7.17 surfaces while retaining legacy translation review',()=>{const d=translationCoverage(actor('employee',['self.read']));expect(d.surfaces.find(x=>x.id==='program-portfolio')?.coverage).toBe('complete');expect(d.surfaces.find(x=>x.id==='meeting-actions')?.coverage).toBe('complete');expect(d.surfaces.some(x=>x.coverage==='legacy_review_required')).toBe(true)});
});
