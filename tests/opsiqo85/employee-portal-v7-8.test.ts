import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read=(p:string)=>readFileSync(p,'utf8');

describe('OPSIQO 8.5 V7.8 employee self-service portal',()=>{
  it('routes employees to a dedicated portal after normal sign-in',()=>{
    const signin=read('src/app/signin/page.tsx');
    expect(signin).toContain("if(me.actor.role==='employee')return'/employee'");
    expect(signin).toContain('if(requested)return requested');
  });

  it('submits leave only with the authenticated employee worker id',()=>{
    const portal=read('src/components/employee-portal-workspace.tsx');
    const time=read('src/lib/time/service.ts');
    expect(portal).toContain('workerId:actor.workerId');
    expect(portal).toContain('/leave/requests');
    expect(time).toContain('Employees can request leave only for themselves.');
  });

  it('exposes employee HR services without granting HR administration',()=>{
    const portal=read('src/components/employee-portal-workspace.tsx');
    const permissions=read('src/lib/auth/permissions.ts');
    expect(portal).toContain('Request HR support');
    expect(portal).toContain('Only services allowed for your role are shown');
    const employeeBlock=permissions.slice(permissions.indexOf('employee: ['));
    expect(employeeBlock).toContain("'service.request'");
    expect(employeeBlock).not.toContain("'service.manage'");
    expect(employeeBlock).not.toContain("'people.manage'");
  });

  it('keeps employee service-ticket data self-scoped',()=>{
    const experience=read('src/lib/experience/service.ts');
    expect(experience).toContain("where('requesterWorkerId','==',actor.workerId)");
  });
});
