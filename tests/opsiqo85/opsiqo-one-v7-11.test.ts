import { describe,expect,it } from 'vitest';
import type { ActorContext,Permission } from '@/domain/security';
import { routeOpsiQoCommand } from '@/lib/opsiqo-one/command-router';
import { allCortexAgents,clampActionLevel } from '@/lib/opsiqo-one/cortex';
function actor(role:ActorContext['role'],permissions:Permission[]):ActorContext{return{uid:'u1',orgId:'o1',role,workerId:'w1',permissions}}

describe('OPSIQO ONE v7.11 governed routing',()=>{
 it('routes workforce questions to governed natural-language analytics',()=>{const r=routeOpsiQoCommand(actor('hr_admin',['self.read','peopleanalytics.read']),'Why is turnover changing?');expect(r.mode).toBe('ai');expect(r.title).toBe('Analyze workforce evidence');expect(r.actionLevel).toBe('recommend')});
 it('does not allow analytics without source permission',()=>{const r=routeOpsiQoCommand(actor('employee',['self.read']),'Show workforce turnover');expect(r.mode).toBe('blocked');expect(r.permission).toContain('peopleanalytics.read')});
 it('retains direct termination block',()=>{const r=routeOpsiQoCommand(actor('hr_admin',['self.read','ai.use']),'Terminate Ahmed today');expect(r.mode).toBe('blocked');expect(r.risk).toBe('consequential');expect(r.requiresHumanDecision).toBe(true)});
 it('prepares leave rather than executing it',()=>{const r=routeOpsiQoCommand(actor('employee',['self.read','leave.request']),'Request vacation next Friday');expect(r.mode).toBe('prepare');expect(r.href).toBe('/time')});
});

describe('Cortex hard safety caps',()=>{
 it('has no unrestricted execute-cap agent in v7.11',()=>expect(allCortexAgents().every(a=>a.maxActionLevel!=='execute')).toBe(true));
 it('cannot clamp above the registered max',()=>expect(clampActionLevel('execute','recommend')).toBe('recommend'));
});
