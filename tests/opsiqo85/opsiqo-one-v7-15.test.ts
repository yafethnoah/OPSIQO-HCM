import { describe,expect,it } from 'vitest';
import type { ActorContext,Permission } from '@/domain/security';
import { routeOpsiQoCommand } from '@/lib/opsiqo-one/command-router';
function actor(role:ActorContext['role'],permissions:Permission[]):ActorContext{return{uid:'u1',orgId:'o1',role,workerId:'w1',permissions}}

describe('OPSIQO ONE v7.15 connected workforce routing',()=>{
 it('routes Unified Workforce only with workforce planning permission',()=>{const r=routeOpsiQoCommand(actor('hr_admin',['self.read','workforce.read']),'Open unified workforce registry');expect(r.href).toBe('/workforce-registry');expect(r.actionLevel).toBe('observe');const denied=routeOpsiQoCommand(actor('employee',['self.read','people.read.directory']),'Open unified workforce registry');expect(denied.mode).toBe('blocked')});
 it('routes Grant Workforce to workforce readers and blocks employee-only access',()=>{const allowed=routeOpsiQoCommand(actor('hr_admin',['self.read','workforce.read']),'Open grant workforce');expect(allowed.href).toBe('/grant-workforce');expect(allowed.actionLevel).toBe('recommend');const denied=routeOpsiQoCommand(actor('employee',['self.read']),'Open grant workforce');expect(denied.mode).toBe('blocked')});
 it('routes Employee Service Center as a governed preparation surface',()=>{const r=routeOpsiQoCommand(actor('employee',['self.read','service.read','service.request']),'Open employee service center');expect(r.href).toBe('/employee-service-center');expect(r.actionLevel).toBe('prepare')});
 it('routes Meeting to Action as a private preparation surface',()=>{const r=routeOpsiQoCommand(actor('employee',['self.read']),'Open meeting to action');expect(r.href).toBe('/meeting-actions');expect(r.actionLevel).toBe('prepare')});
 it('keeps consequential employment protection ahead of V7.15 routing',()=>{const r=routeOpsiQoCommand(actor('hr_admin',['self.read','workforce.read']),'Open grant workforce and terminate Ahmed now');expect(r.mode).toBe('blocked');expect(r.risk).toBe('consequential');expect(r.href).toBe('/separations')});
});
