import { describe, expect, it } from 'vitest';
import { STANDARD_HR_SERVICE_BLUEPRINTS } from '@/lib/experience/service-blueprints';
import { workflowMatchesEvent } from '@/lib/workflow/conditions';
import type { DomainEvent } from '@/domain/automation';
import type { WorkflowDefinition } from '@/domain/workflow';

const event:DomainEvent={id:'e1',orgId:'o1',type:'service.ticket_created',entityType:'hrServiceTicket',entityId:'t1',actorUid:'u1',payload:{priority:'high',category:'payroll',score:82,nested:{flag:true}},status:'pending',attempts:0,createdAt:'2026-08-15T00:00:00.000Z',updatedAt:'2026-08-15T00:00:00.000Z'};
const base:WorkflowDefinition={id:'w1',name:'test',trigger:'service.ticket_created',enabled:true,version:1,steps:[{id:'notify',name:'Notify',type:'notification'}],createdAt:event.createdAt,updatedAt:event.updatedAt};

describe('OPSIQO 8.5 V7.9 enterprise self-service and automation',()=>{
 it('ships a unique standard HR service catalog',()=>{const codes=STANDARD_HR_SERVICE_BLUEPRINTS.map(x=>x.code);expect(new Set(codes).size).toBe(codes.length);expect(codes).toContain('PERSONAL_INFO_CHANGE');expect(codes).toContain('EMPLOYMENT_LETTER');expect(codes).toContain('EQUIPMENT_ACCESS');expect(codes).toContain('WORKPLACE_CONCERN');});
 it('matches event payload conditions without code evaluation',()=>{expect(workflowMatchesEvent({...base,conditions:[{field:'payload.priority',operator:'eq',value:'high'}]},event)).toBe(true);expect(workflowMatchesEvent({...base,conditions:[{field:'payload.category',operator:'contains',value:'pay'}]},event)).toBe(true);expect(workflowMatchesEvent({...base,conditions:[{field:'payload.score',operator:'gte',value:80}]},event)).toBe(true);expect(workflowMatchesEvent({...base,conditions:[{field:'payload.priority',operator:'eq',value:'low'}]},event)).toBe(false);});
 it('supports all/any condition modes',()=>{const conditions=[{field:'payload.priority',operator:'eq' as const,value:'high'},{field:'payload.category',operator:'eq' as const,value:'benefits'}];expect(workflowMatchesEvent({...base,conditions,conditionMode:'all'},event)).toBe(false);expect(workflowMatchesEvent({...base,conditions,conditionMode:'any'},event)).toBe(true);});
});
