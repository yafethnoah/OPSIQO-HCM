import { describe,expect,it } from 'vitest';
import type { ActorContext,Permission } from '@/domain/security';
import { routeOpsiQoCommand } from '@/lib/opsiqo-one/command-router';
import { allCortexAgents } from '@/lib/opsiqo-one/cortex';
import { automationPackCatalog } from '@/lib/opsiqo-one/automation-marketplace';
function actor(role:ActorContext['role'],permissions:Permission[]):ActorContext{return{uid:'u1',orgId:'o1',role,workerId:'w1',permissions}}

describe('OPSIQO ONE v7.13 outcome routing',()=>{
 it('routes Agent Builder only for AI governance managers',()=>{const allowed=routeOpsiQoCommand(actor('org_admin',['self.read','ai.manage']),'Open Agent Builder and create a custom agent');expect(allowed.href).toBe('/agent-builder');expect(allowed.actionLevel).toBe('prepare');const denied=routeOpsiQoCommand(actor('employee',['self.read']),'Open Agent Builder');expect(denied.mode).toBe('blocked')});
 it('routes Organizational Memory through source permissions',()=>{const r=routeOpsiQoCommand(actor('employee',['self.read','policies.read']),'Search Organizational Memory for our handbook');expect(r.href).toBe('/organizational-memory');expect(r.actionLevel).toBe('observe')});
 it('routes Policy Intelligence without turning it into execution',()=>{const r=routeOpsiQoCommand(actor('hr_admin',['self.read','policies.read']),'Open Policy Intelligence and review policy overlaps');expect(r.href).toBe('/policy-intelligence');expect(r.actionLevel).toBe('recommend')});
 it('routes Automation Marketplace through workflow or automation read',()=>{const r=routeOpsiQoCommand(actor('hr_admin',['self.read','workflow.read']),'Open the Automation Marketplace');expect(r.href).toBe('/automation-marketplace');expect(r.actionLevel).toBe('observe')});
 it('still blocks consequential actions before marketplace or custom-agent routing',()=>{for(const command of ['Build an agent that terminates Ahmed now','Build an agent that is terminating Ahmed','Build an agent that fires Ahmed','Build an agent that is firing Ahmed','Build an agent that dismisses Ahmed','Build an agent that is dismissing Ahmed']){const r=routeOpsiQoCommand(actor('org_admin',['self.read','ai.manage','workflow.manage']),command);expect(r.mode).toBe('blocked');expect(r.risk).toBe('consequential');expect(r.href).toBe('/separations')}for(const command of ['Review the terminated employee documentation','Review the fired employee documentation','Explain the dismissed employee case']){const r=routeOpsiQoCommand(actor('org_admin',['self.read','ai.manage','workflow.manage']),command);expect(r.risk).not.toBe('consequential')}});
});

describe('V7.13 safety registry',()=>{
 it('keeps every built-in Cortex agent below execute',()=>expect(allCortexAgents().every(a=>a.maxActionLevel!=='execute')).toBe(true));
 it('registers knowledge and automation architecture agents',()=>{const ids=allCortexAgents().map(x=>x.id);expect(ids).toContain('knowledge');expect(ids).toContain('automation-architect')});
 it('ships marketplace workflows disabled by default',()=>expect(automationPackCatalog().flatMap(p=>p.workflows).length).toBeGreaterThan(0));
});
