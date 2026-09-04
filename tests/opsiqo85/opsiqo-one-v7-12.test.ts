import { describe,expect,it } from 'vitest';
import type { ActorContext,Permission } from '@/domain/security';
import { routeOpsiQoCommand } from '@/lib/opsiqo-one/command-router';
import { allCortexAgents } from '@/lib/opsiqo-one/cortex';
function actor(role:ActorContext['role'],permissions:Permission[]):ActorContext{return{uid:'u1',orgId:'o1',role,workerId:'w1',permissions}}

describe('OPSIQO ONE v7.12 outcome routing',()=>{
 it('routes Career GPS from natural language',()=>{const r=routeOpsiQoCommand(actor('employee',['self.read','career.read']),'Open my Career GPS for my next role');expect(r.href).toBe('/career-gps');expect(r.actionLevel).toBe('recommend')});
 it('routes the internal talent marketplace',()=>{const r=routeOpsiQoCommand(actor('employee',['self.read','career.read']),'Show internal opportunities in the talent marketplace');expect(r.href).toBe('/talent-marketplace');expect(r.mode).toBe('navigate')});
 it('routes what-if workforce questions to Scenario Lab',()=>{const r=routeOpsiQoCommand(actor('hr_admin',['self.read','workforce.read']),'What if we increase headcount? Open Scenario Lab');expect(r.href).toBe('/scenario-lab');expect(r.actionLevel).toBe('recommend')});
 it('routes AI value only with audit/management permission',()=>{const allowed=routeOpsiQoCommand(actor('org_admin',['self.read','ai.audit']),'Show AI value and AI ROI');expect(allowed.href).toBe('/ai-value');const denied=routeOpsiQoCommand(actor('employee',['self.read']),'Show AI value and AI ROI');expect(denied.mode).toBe('blocked')});
 it('still blocks consequential termination before Cortex routing',()=>{const r=routeOpsiQoCommand(actor('hr_admin',['self.read','career.read','workforce.read','ai.audit']),'Terminate this employee and then show Career GPS');expect(r.mode).toBe('blocked');expect(r.risk).toBe('consequential')});
});

describe('V7.12 Cortex registry',()=>{
 it('registers a talent mobility agent',()=>expect(allCortexAgents().some(a=>a.id==='talent-mobility'&&a.maxActionLevel==='recommend')).toBe(true));
 it('keeps every agent below execute',()=>expect(allCortexAgents().every(a=>a.maxActionLevel!=='execute')).toBe(true));
});
