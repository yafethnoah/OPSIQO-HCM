import { describe,expect,it } from 'vitest';
import type { ActorContext,Permission } from '@/domain/security';
import { routeOpsiQoCommand } from '@/lib/opsiqo-one/command-router';
import { aiLanguageInstruction,htmlDirection } from '@/lib/opsiqo-one/multilingual-intelligence';
import { rankNavigationItems } from '@/lib/opsiqo-one/navigation-intelligence';
function actor(role:ActorContext['role'],permissions:Permission[]):ActorContext{return{uid:'u1',orgId:'o1',role,workerId:'w1',permissions}}

describe('OPSIQO ONE v7.14 routing',()=>{
 it('routes Daily Brief as observation',()=>{const r=routeOpsiQoCommand(actor('employee',['self.read']),'Give me my daily brief');expect(r.href).toBe('/daily-brief');expect(r.actionLevel).toBe('observe')});
 it('routes Organization Launchpad only to organization managers',()=>{const allowed=routeOpsiQoCommand(actor('org_admin',['self.read','organization.manage']),'Open organization setup launchpad');expect(allowed.href).toBe('/organization-launchpad');expect(allowed.actionLevel).toBe('prepare');const denied=routeOpsiQoCommand(actor('employee',['self.read']),'Open organization setup launchpad');expect(denied.mode).toBe('blocked')});
 it('still blocks consequential action before setup routing',()=>{const r=routeOpsiQoCommand(actor('org_admin',['self.read','organization.manage']),'Set up organization and terminate Ahmed now');expect(r.mode).toBe('blocked');expect(r.risk).toBe('consequential')});
});

describe('V7.14 multilingual and navigation intelligence',()=>{
 it('uses RTL only for Arabic',()=>{expect(htmlDirection('ar')).toBe('rtl');expect(htmlDirection('fr')).toBe('ltr')});
 it('preserves canonical evidence in multilingual instruction',()=>expect(aiLanguageInstruction('ar')).toMatch(/Preserve canonical evidence IDs/));
 it('ranks semantic keywords above unrelated pages',()=>{const items=[{label:'Time & Leave',href:'/time',keywords:['vacation','pto'],priority:10},{label:'People Analytics',href:'/people-analytics',keywords:['turnover'],priority:10}];expect(rankNavigationItems(items,'vacation')[0]?.href).toBe('/time')});
});
