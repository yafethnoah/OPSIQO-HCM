import { describe,expect,it } from 'vitest';
import type { ActorContext, Permission } from '@/domain/security';
import { routeOpsiQoCommand } from '@/lib/opsiqo-one/command-router';
import { clampActionLevel,visibleCortexAgents } from '@/lib/opsiqo-one/cortex';

function actor(role:ActorContext['role'],permissions:Permission[],workerId='worker-1'):ActorContext{return{uid:'user-1',orgId:'org-1',role,workerId,permissions}}

describe('OPSIQO ONE command governance',()=>{
  it('prepares a leave handoff without executing the write',()=>{
    const result=routeOpsiQoCommand(actor('employee',['self.read','leave.request']),'Request vacation next Friday');
    expect(result.mode).toBe('prepare');expect(result.actionLevel).toBe('prepare');expect(result.href).toBe('/time');expect(result.risk).toBe('administrative');
  });
  it('blocks direct consequential employee termination',()=>{
    const result=routeOpsiQoCommand(actor('hr_admin',['self.read','separation.manage']),'Terminate this employee today');
    expect(result.mode).toBe('blocked');expect(result.risk).toBe('consequential');expect(result.requiresHumanDecision).toBe(true);expect(result.href).toBe('/separations');
  });
  it('uses governed AI only as a recommendation fallback',()=>{
    const result=routeOpsiQoCommand(actor('hr_admin',['self.read','ai.use']),'Explain organizational risk evidence');
    expect(result.mode).toBe('ai');expect(result.actionLevel).toBe('recommend');expect(result.permission).toBe('ai.use');
  });
  it('falls back to guided routing when AI is not permitted',()=>{
    const result=routeOpsiQoCommand(actor('employee',['self.read']),'Explain organizational risk evidence');
    expect(result.mode).toBe('navigate');expect(result.href).toBe('/more');
  });
  it('denies a prepared action when its permission is absent',()=>{
    const result=routeOpsiQoCommand(actor('employee',['self.read']),'Request vacation tomorrow');
    expect(result.mode).toBe('blocked');expect(result.permission).toBe('leave.request');
  });
});

describe('OPSIQO Cortex permission visibility',()=>{
  it('exposes the employee-services agent to self-service users',()=>{
    const rows=visibleCortexAgents(actor('employee',['self.read']));
    expect(rows.some(row=>row.id==='employee-services')).toBe(true);
    expect(rows.some(row=>row.id==='recruitment')).toBe(false);
  });
  it('exposes recruiting and analytics agents only with source permissions',()=>{
    const rows=visibleCortexAgents(actor('hr_admin',['self.read','recruiting.read','peopleanalytics.read']));
    expect(rows.some(row=>row.id==='recruitment')).toBe(true);
    expect(rows.some(row=>row.id==='analytics')).toBe(true);
  });
  it('never escalates a requested action level above the registered maximum',()=>{
    expect(clampActionLevel('execute','prepare')).toBe('prepare');
    expect(clampActionLevel('observe','prepare')).toBe('observe');
  });
});
